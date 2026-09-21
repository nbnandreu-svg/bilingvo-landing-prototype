/* Submit through the one configured native Tilda form and its anti-spam flow. */
(() => {
  'use strict';
  let busy=false;
  const selector='#rec3791816301 form';
  function available(){
    const service=document.querySelector(`${selector} .js-formaction-services`);
    return location.origin==='https://welcomebilingvo.tilda.ws'&&
      service&&/^[a-f0-9]{32}$/.test(service.value)&&typeof window.tildaForm?.send==='function';
  }
  async function send(fields,kind){
    if(!available()||busy)throw new Error('Native form unavailable');
    busy=true;
    const form=document.querySelector(selector);
    // Keep platform receiver IDs and anti-spam fields. Use only allowlisted
    // bounded user fields; original decorative fields are not submitted.
    form.querySelectorAll('input[name="Email"],input[name="Name"]').forEach(input=>{input.disabled=true;input.required=false;input.removeAttribute('data-tilda-req');input.removeAttribute('data-tilda-rule');input.classList.remove('js-tilda-rule');});
    form.querySelectorAll('[data-bl-transfer]').forEach(input=>input.remove());
    for(const [key,max] of Object.entries({name:100,email:254,contact:120,company:200,message:2000,consent:16})){
      if(typeof fields[key]!=='string')continue;
      const input=document.createElement('input');input.type='hidden';input.className='js-tilda-rule';input.name=key;input.value=fields[key].slice(0,max);input.dataset.blTransfer='';form.appendChild(input);
    }
    const category=document.createElement('input');category.type='hidden';category.name='request_type';category.value=kind==='sample'?'video_sample':'demo';category.dataset.blTransfer='';form.appendChild(category);
    form.setAttribute('data-success-popup','n');
    form.removeAttribute('data-success-url');form.removeAttribute('data-success-callback');form.removeAttribute('data-formsended-callback');
    form.querySelectorAll('.js-successbox').forEach(box=>box.remove());
    form.classList.remove('js-send-form-success','js-send-form-error');
    const guard=event=>event.preventDefault();
    form.addEventListener('submit',guard);
    try{
      await new Promise((resolve,reject)=>{
        let timer;
        const cleanup=()=>{clearTimeout(timer);form.removeEventListener('tildaform:aftersuccess',success);form.removeEventListener('tildaform:aftererror',failure);};
        const success=()=>{cleanup();resolve();};
        const failure=()=>{cleanup();reject(new Error('Native form rejected'));};
        form.addEventListener('tildaform:aftersuccess',success,{once:true});
        form.addEventListener('tildaform:aftererror',failure,{once:true});
        timer=setTimeout(failure,45000);
        try{form.requestSubmit(form.querySelector('[type=submit]'));}catch(error){cleanup();reject(error);}
      });
    }finally{busy=false;form.removeEventListener('submit',guard);form.querySelectorAll('[data-bl-transfer]').forEach(input=>input.remove());}
  }
  Object.defineProperty(window,'BilingvoForms',{value:Object.freeze({available,send}),writable:false,configurable:false});
})();
