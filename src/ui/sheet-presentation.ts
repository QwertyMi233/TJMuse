import React from 'react';
export function containsSheetInput(children:React.ReactNode,inputTypes:ReadonlySet<unknown>):boolean{
 return React.Children.toArray(children).some(child=>React.isValidElement<{children?:React.ReactNode}>(child)&&(inputTypes.has(child.type)||containsSheetInput(child.props.children,inputTypes)));
}
export function sheetPresentation(platform:string,size:'content'|'large',hasInput:boolean,explicitInput=false):'content'|'form'{
 return platform==='ios'&&(size==='large'||hasInput||explicitInput)?'form':'content';
}
