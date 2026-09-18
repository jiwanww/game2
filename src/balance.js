export const ULT_COST={spidey:7,arc:8,bane:7,cap:8,thor:9,widow:6,pigeon:7,ant:10,hera:9,panther:8,vision:8};
export const HIT_MULTIPLIERS={head:1.5,body:1,legs:.75};
export function hitRegion(body,point,object){if(object?.userData.hitRegion)return object.userData.hitRegion;if(!point||!body)return 'body';const ratio=(point.y-body.p.y+body.h.y)/(2*body.h.y);return ratio>.82?'head':ratio<.4?'legs':'body';}
