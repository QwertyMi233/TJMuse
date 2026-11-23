import React from 'react';
import {Image} from 'react-native';

export default function BrandLogo({size=24}:{size?:number}){
  return <Image source={require('../../assets/logo-mark.png')} accessibilityLabel="TJMuse" resizeMode="contain" style={{width:size,height:size}}/>;
}
