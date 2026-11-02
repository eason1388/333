export const portalConfigs={
  ziwei:{name:'紫微斗數',symbol:'紫',storageKey:'ziwei-member-session',memberStart:92575,memberEnd:93500,passwordPrefix:'ab',passwordStart:8991,authVersion:'ziwei-sequential-v2'},
  bazi:{name:'八字',symbol:'八',storageKey:'bazi-member-session',memberStart:92575,memberEnd:93500,passwordPrefix:'bz',passwordStart:8991,authVersion:'bazi-sequential-v1'},
  fengshui:{name:'風水堪輿',symbol:'風',storageKey:'fengshui-member-session',memberStart:92575,memberEnd:93500,passwordPrefix:'fs',passwordStart:8991,authVersion:'fengshui-sequential-v1'}
};

export function expectedPassword(config,memberNumber){
  if(!Number.isInteger(memberNumber)||memberNumber<config.memberStart||memberNumber>config.memberEnd)return null;
  return `${config.passwordPrefix}${String(config.passwordStart+(memberNumber-config.memberStart)).padStart(4,'0')}`;
}

export function validateCredentials(portal,rawMemberNumber,password){
  const config=portalConfigs[portal];
  const normalizedMemberNumber=String(rawMemberNumber).trim();
  if(!config||!/^\d+$/.test(normalizedMemberNumber))return null;
  const memberNumber=Number(normalizedMemberNumber);
  return password===expectedPassword(config,memberNumber)?memberNumber:null;
}
