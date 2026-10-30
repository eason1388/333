const openButton=document.querySelector('#member-login-open');
const dialog=document.querySelector('#member-login-dialog');
const loginForm=document.querySelector('#member-login-form');
const accountPanel=document.querySelector('#member-account');
const numberInput=document.querySelector('#member-number');
const passwordInput=document.querySelector('#member-password');
const message=document.querySelector('#member-login-message');
const accountNumber=document.querySelector('#member-account-number');
const courseList=document.querySelector('#member-course-list');
const storageKey='ziwei-member-session';
const courseSlides=[29,28,28,25,39,29,31,20,19,16,23,22,17,16,19,16,16,17,17,21];

courseSlides.forEach((slideCount,index)=>{
  const lesson=index+1;
  const link=document.createElement('a');
  link.className='member-course-link';
  link.href=`./courses/ziwei-lesson-${String(lesson).padStart(2,'0')}.pptx`;
  link.download=`紫微斗數_第${lesson}堂_學生版_大字詳解_v2.pptx`;
  link.innerHTML=`<span><strong>第 ${lesson} 堂</strong><small>${slideCount} 張投影片</small></span><span>下載 PPTX</span>`;
  courseList.append(link);
});

function currentMember(){
  try{
    const value=JSON.parse(localStorage.getItem(storageKey));
    return Number.isInteger(value?.memberNumber)&&value.memberNumber>=92575&&value.memberNumber<=93500?value.memberNumber:null;
  }catch{return null;}
}

function updateMemberState(){
  const memberNumber=currentMember();
  const loggedIn=memberNumber!==null;
  openButton.dataset.loggedIn=String(loggedIn);
  openButton.textContent=loggedIn?'會員中心':'會員登入';
  openButton.setAttribute('aria-label',loggedIn?`已登入會員 ${memberNumber}，開啟會員中心`:'會員登入');
  loginForm.hidden=loggedIn;
  accountPanel.hidden=!loggedIn;
  accountNumber.textContent=loggedIn?String(memberNumber):'';
}

function openDialog(){
  updateMemberState();
  message.textContent='';
  message.classList.remove('success');
  dialog.showModal();
  if(!currentMember())requestAnimationFrame(()=>numberInput.focus());
}

function closeDialog(){dialog.close();}

openButton.addEventListener('click',openDialog);
document.querySelector('#member-login-close').addEventListener('click',closeDialog);
document.querySelector('#member-account-close').addEventListener('click',closeDialog);
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

  localStorage.setItem(storageKey,JSON.stringify({memberNumber}));
  message.textContent='登入成功。';
  message.classList.add('success');
  passwordInput.value='';
  updateMemberState();
});

document.querySelector('#member-logout').addEventListener('click',()=>{
  localStorage.removeItem(storageKey);
  numberInput.value='';
  passwordInput.value='';
  updateMemberState();
  closeDialog();
});

updateMemberState();
