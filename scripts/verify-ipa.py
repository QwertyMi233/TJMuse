"""Verify a device IPA in-place without extracting or executing its contents."""
import hashlib
import json
import plistlib
import struct
import sys
import zipfile
from pathlib import Path


def macho_details(data):
    magic = data[:4]
    fat_formats = {
        b"\xca\xfe\xba\xbe": (">", False), b"\xbe\xba\xfe\xca": ("<", False),
        b"\xca\xfe\xba\xbf": (">", True), b"\xbf\xba\xfe\xca": ("<", True),
    }
    if magic in fat_formats:
        endian, fat64 = fat_formats[magic]
        count = struct.unpack_from(endian + "I", data, 4)[0]
        entry_size = 32 if fat64 else 20
        for index in range(count):
            entry = struct.unpack_from(endian + ("IIQQII" if fat64 else "IIIII"), data, 8 + index * entry_size)
            if entry[0] == 0x0100000C:
                data = data[entry[2]:entry[2] + entry[3]]
                break
        else:
            raise ValueError("No ARM64 executable in universal Mach-O")
        magic = data[:4]
    if magic not in (b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf"):
        raise ValueError("Expected a 64-bit Mach-O iPhone executable")
    endian = "<" if magic == b"\xcf\xfa\xed\xfe" else ">"
    cpu = struct.unpack_from(endian + "I", data, 4)[0]
    if cpu != 0x0100000C:
        raise ValueError(f"Expected ARM64, found CPU {cpu:#x}")
    count = struct.unpack_from(endian + "I", data, 16)[0]
    offset, platform, encrypted, signature, sdk = 32, None, False, False, None
    for _ in range(count):
        command, size = struct.unpack_from(endian + "II", data, offset)
        if size < 8 or offset + size > len(data):
            raise ValueError("Invalid Mach-O load command")
        if command == 0x32:  # LC_BUILD_VERSION
            platform, _, sdk = struct.unpack_from(endian + "III", data, offset + 8)
        elif command == 0x25:  # LC_VERSION_MIN_IPHONEOS
            platform = 2
        elif command in (0x21, 0x2C):  # LC_ENCRYPTION_INFO / _64
            encrypted |= struct.unpack_from(endian + "I", data, offset + 16)[0] != 0
        elif command == 0x1D:  # LC_CODE_SIGNATURE
            signature = True
        offset += size
    if platform != 2:
        raise ValueError(f"Expected real iOS device platform 2, found {platform}; simulator builds cannot be used")
    if encrypted:
        raise ValueError("Executable is encrypted and cannot be used as a local unsigned build")
    return {"architecture": "arm64", "platform": "iPhoneOS", "encrypted": encrypted,
            "hasCodeSignatureLoadCommand": signature,
            "sdk": f"{sdk >> 16}.{(sdk >> 8) & 255}.{sdk & 255}" if sdk else None}


def verify(ipa):
    with zipfile.ZipFile(ipa) as archive:
        failed = archive.testzip()
        if failed:
            raise ValueError(f"ZIP integrity failure: {failed}")
        infos = [name for name in archive.namelist() if name.startswith("Payload/") and name.endswith(".app/Info.plist") and name.count("/") == 2]
        if len(infos) != 1:
            raise ValueError("Expected exactly one main application in Payload")
        root = infos[0][:-len("Info.plist")]
        info = plistlib.loads(archive.read(infos[0]))
        if info.get("CFBundleIdentifier") != "com.tjmuse.app" or info.get("CFBundleShortVersionString") != "0.1.0":
            raise ValueError("Unexpected app identifier or version")
        if "iPhoneOS" not in info.get("CFBundleSupportedPlatforms", []):
            raise ValueError("Info.plist does not identify an iPhone device app")
        binary = macho_details(archive.read(root + info["CFBundleExecutable"]))
        profile = root + "embedded.mobileprovision" in archive.namelist()
        if profile:
            raise ValueError("Unexpected Apple provisioning profile in the requested unsigned build")
        bundles = [item for item in archive.infolist() if item.filename.startswith(root) and item.filename.endswith((".jsbundle", ".hbc")) and item.file_size > 1024]
        if not bundles:
            raise ValueError("Release JavaScript bundle is missing or empty")
        result = {"file": ipa.name, "zipIntegrityVerified": True,
                  "bundleIdentifier": info["CFBundleIdentifier"],
                  "version": info["CFBundleShortVersionString"], "buildNumber": info.get("CFBundleVersion"),
                  "minimumOSVersion": info.get("MinimumOSVersion"),
                  "containsProvisioningProfile": profile, "requiresLocalSigning": True,
                  "javascriptBundles": [{"path": item.filename, "sizeBytes": item.file_size} for item in bundles],
                  "executable": binary, "sizeBytes": ipa.stat().st_size}
    with ipa.open("rb") as stream:
        result["sha256"] = hashlib.file_digest(stream, "sha256").hexdigest()
    Path(str(ipa) + ".verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(str(ipa) + ".sha256").write_text(f"{result['sha256']}  {ipa.name}\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    print(json.dumps(verify(Path(sys.argv[1])), ensure_ascii=False, indent=2))
