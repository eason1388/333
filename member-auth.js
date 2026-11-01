const openButton=document.querySelector('#member-login-open');
const dialog=document.querySelector('#member-login-dialog');
const loginForm=document.querySelector('#member-login-form');
const accountPanel=document.querySelector('#member-account');
const loginTitle=document.querySelector('#member-login-title');
const loginIntro=document.querySelector('#member-login-intro');
const numberInput=document.querySelector('#member-number');
const passwordInput=document.querySelector('#member-password');
const message=document.querySelector('#member-login-message');
const accountNumber=document.querySelector('#member-account-number');
const accountHeading=document.querySelector('#member-account-heading');
const accountLabel=document.querySelector('#member-account-label');
const memberAvatar=document.querySelector('#member-avatar');
const courseList=document.querySelector('#member-course-list');
const memberWelcome=document.querySelector('#member-welcome');
const memberLibrary=document.querySelector('#member-library');
const courseViewer=document.querySelector('#member-course-viewer');
const courseViewerTitle=document.querySelector('#course-viewer-title');
const courseViewerFrame=document.querySelector('#course-viewer-frame');
const courseViewerDownload=document.querySelector('#course-viewer-download');
const courseViewerNewTab=document.querySelector('#course-viewer-new-tab');
const logoutButton=document.querySelector('#member-logout');
const emptyPortal=document.querySelector('#member-empty-portal');
const emptySymbol=document.querySelector('#member-empty-symbol');
const emptyTitle=document.querySelector('#member-empty-title');
const portalConfigs={
  ziwei:{name:'紫微斗數',symbol:'紫',storageKey:'ziwei-member-session'},
  bazi:{name:'八字',symbol:'八',storageKey:'bazi-member-session'},
  fengshui:{name:'風水堪輿',symbol:'風',storageKey:'fengshui-member-session'}
};
let activePortal='ziwei';
const courseSlides=[29,28,28,25,39,29,31,20,19,16,23,22,17,16,19,16,16,17,17,21];

courseSlides.forEach((slideCount,index)=>{
  const lesson=index+1;
  const fileStem=`ziwei-lesson-${String(lesson).padStart(2,'0')}`;
  const card=document.createElement('article');
  card.className='member-course-card';
  card.innerHTML=`<span><strong>第 ${lesson} 堂</strong><small>${slideCount} 張投影片</small></span><span class="member-course-actions"><button type="button">線上看</button><a href="./courses/${fileStem}.pptx" download="紫微斗數_第${lesson}堂_學生版_大字詳解_v2.pptx">下載 PPTX</a></span>`;
  card.querySelector('button').addEventListener('click',()=>openCourseViewer(lesson,fileStem));
  courseList.append(card);
});

function openCourseViewer(lesson,fileStem){
  const pdfUrl=new URL(`./courses/${fileStem}.pdf`,window.location.href).href;
  memberWelcome.hidden=true;
  memberLibrary.hidden=true;
  logoutButton.hidden=true;
  courseViewer.hidden=false;
  courseViewerTitle.textContent=`紫微斗數・第 ${lesson} 堂`;
  courseViewerFrame.src=`${pdfUrl}#view=FitH&toolbar=1&navpanes=0`;
  courseViewerNewTab.href=pdfUrl;
  courseViewerDownload.href=`./courses/${fileStem}.pptx`;
  courseViewerDownload.download=`紫微斗數_第${lesson}堂_學生版_大字詳解_v2.pptx`;
  dialog.scrollTo({top:0,behavior:'smooth'});
}

function closeCourseViewer(){
  courseViewerFrame.removeAttribute('src');
  courseViewer.hidden=true;
  memberWelcome.hidden=false;
  memberLibrary.hidden=false;
  logoutButton.hidden=false;
}

function currentMember(){
  try{
    const value=JSON.parse(localStorage.getItem(portalConfigs[activePortal].storageKey));
    return Number.isInteger(value?.memberNumber)&&value.memberNumber>=92575&&value.memberNumber<=93500?value.memberNumber:null;
  }catch{return null;}
}

function updatePortalCopy(){
  const config=portalConfigs[activePortal];
  loginTitle.textContent=`${config.name}會員登入`;
  loginIntro.textContent=`請輸入${config.name}會員編號與密碼。`;
  accountHeading.textContent=`${config.name}會員中心`;
  accountLabel.textContent=`已登入${config.name}會員`;
  memberAvatar.textContent=config.symbol;
  emptySymbol.textContent=config.symbol;
  emptyTitle.textContent=`${config.name}會員專區`;
  logoutButton.textContent=`登出${config.name}會員`;
  document.querySelectorAll('[data-portal]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.portal===activePortal)));
}

function updateMemberState(){
  const memberNumber=currentMember();
  const loggedIn=memberNumber!==null;
  const hasAnySession=Object.values(portalConfigs).some(config=>{
    try{return Boolean(JSON.parse(localStorage.getItem(config.storageKey))?.memberNumber);}catch{return false;}
  });
  openButton.dataset.loggedIn=String(hasAnySession);
  openButton.textContent=hasAnySession?'會員中心':'會員登入';
  openButton.setAttribute('aria-label',loggedIn?`已登入${portalConfigs[activePortal].name}會員 ${memberNumber}，開啟會員中心`:(hasAnySession?'開啟會員中心':'會員登入'));
  loginForm.hidden=loggedIn;
  accountPanel.hidden=!loggedIn;
  accountNumber.textContent=loggedIn?String(memberNumber):'';
  if(loggedIn){
    const isZiwei=activePortal==='ziwei';
    memberLibrary.hidden=!isZiwei;
    emptyPortal.hidden=isZiwei;
  }
}

function switchPortal(portal){
  if(!portalConfigs[portal])return;
  closeCourseViewer();
  activePortal=portal;
  numberInput.value='';
  passwordInput.value='';
  message.textContent='';
  updatePortalCopy();
  updateMemberState();
  if(!currentMember())requestAnimationFrame(()=>numberInput.focus());
}

function openDialog(){
  updatePortalCopy();
  updateMemberState();
  message.textContent='';
  message.classList.remove('success');
  dialog.showModal();
  if(!currentMember())requestAnimationFrame(()=>numberInput.focus());
}

function closeDialog(){closeCourseViewer();dialog.close();}

openButton.addEventListener('click',openDialog);
document.querySelector('#member-login-close').addEventListener('click',closeDialog);
document.querySelector('#member-account-close').addEventListener('click',closeDialog);
document.querySelector('#course-viewer-back').addEventListener('click',closeCourseViewer);
document.querySelectorAll('[data-portal]').forEach(button=>button.addEventListener('click',()=>switchPortal(button.dataset.portal)));
dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});

loginForm.addEventListener('submit',event=>{
  event.preventDefault();
  const memberNumber=Number(numberInput.value.trim());
  const password=passwordInput.value.trim();
  const passwordMatch=/^ab(\d{4})$/.exec(password);
  const validNumber=/^\d{5}$/.test(numberInput.value.trim())&&memberNumber>=92575&&memberNumber<=93500;
  const passwordNumber=passwordMatch?Number(passwordMatch[1]):NaN;
  const validPassword=passwordNumber>=8991&&passwordNumber<=9991;

  if(!validNumber||!validPassword){
    message.textContent='會員編號或密碼不正確，請重新輸入。';
    message.classList.remove('success');
    passwordInput.select();
    return;
  }

  localStorage.setItem(portalConfigs[activePortal].storageKey,JSON.stringify({memberNumber}));
  message.textContent='登入成功。';
  message.classList.add('success');
  passwordInput.value='';
  updateMemberState();
});

logoutButton.addEventListener('click',()=>{
  localStorage.removeItem(portalConfigs[activePortal].storageKey);
  numberInput.value='';
  passwordInput.value='';
  updateMemberState();
  closeDialog();
});

updatePortalCopy();
updateMemberState();
