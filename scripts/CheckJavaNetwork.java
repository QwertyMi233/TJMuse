import java.net.*;
public class CheckJavaNetwork {
  public static void main(String[] args) {
    for (String address : new String[]{"https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/9.2.1/gradle-9.2.1.pom", "https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-gradle-plugin/2.2.0/kotlin-gradle-plugin-2.2.0.pom"}) {
      try { var c = (HttpURLConnection) URI.create(address).toURL().openConnection(); c.setConnectTimeout(8000); c.setReadTimeout(8000); System.out.println(URI.create(address).getHost() + " " + c.getResponseCode()); c.disconnect(); }
      catch (Exception e) { System.out.println(URI.create(address).getHost() + " " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
    }
  }
}
