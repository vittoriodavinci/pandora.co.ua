(function(){
  const DEFAULT_MIN_SECONDS=4;

  const TEXT={
    ru:{emailRequired:'Укажите email.',emailInvalid:'Введите корректный email.',phoneRequired:'Укажите телефон.',phoneInvalid:'Введите корректный телефон.',messageRequired:'Напишите сообщение.',messageTooShort:'Сообщение слишком короткое. Напишите хотя бы пару слов.',messageTooLong:'Сообщение слишком длинное.',messageLooksSpam:'Сообщение похоже на спам.',messageTooManyLinks:'Слишком много ссылок в сообщении.',spamTooFast:'Форма отправлена слишком быстро. Проверьте сообщение и попробуйте ещё раз.'},
    uk:{emailRequired:'Вкажіть email.',emailInvalid:'Введіть коректний email.',phoneRequired:'Вкажіть телефон.',phoneInvalid:'Введіть коректний телефон.',messageRequired:'Напишіть повідомлення.',messageTooShort:'Повідомлення занадто коротке. Напишіть хоча б кілька слів.',messageTooLong:'Повідомлення занадто довге.',messageLooksSpam:'Повідомлення схоже на спам.',messageTooManyLinks:'Забагато посилань у повідомленні.',spamTooFast:'Форму надіслано занадто швидко. Перевірте повідомлення і спробуйте ще раз.'},
    en:{emailRequired:'Provide an email.',emailInvalid:'Enter a valid email.',phoneRequired:'Provide a phone number.',phoneInvalid:'Enter a valid phone number.',messageRequired:'Write a message.',messageTooShort:'The message is too short. Write at least a few words.',messageTooLong:'The message is too long.',messageLooksSpam:'The message looks like spam.',messageTooManyLinks:'Too many links in the message.',spamTooFast:'The form was submitted too quickly. Check the message and try again.'},
    es:{emailRequired:'Indica un email.',emailInvalid:'Introduce un email válido.',phoneRequired:'Indica un teléfono.',phoneInvalid:'Introduce un teléfono válido.',messageRequired:'Escribe un mensaje.',messageTooShort:'El mensaje es demasiado corto. Escribe al menos unas palabras.',messageTooLong:'El mensaje es demasiado largo.',messageLooksSpam:'El mensaje parece spam.',messageTooManyLinks:'Demasiados enlaces en el mensaje.',spamTooFast:'El formulario se envió demasiado rápido. Revisa el mensaje e inténtalo de nuevo.'}
  };

  window.getPandoraLang=function(){
    try{return (localStorage.getItem('pandora_lang')||document.documentElement.lang||'uk').slice(0,2)}catch(e){return (document.documentElement.lang||'uk').slice(0,2)}
  };

  window.pandoraFormText=function(key){
    const lang=window.getPandoraLang();
    const dict=TEXT[lang]||TEXT.en;
    return dict[key]||TEXT.en[key]||key;
  };

  function setError(input,key){
    if(!input)return false;
    input.setCustomValidity(window.pandoraFormText(key));
    input.reportValidity();
    return false;
  }

  function clear(input){
    if(input)input.setCustomValidity('');
  }

  function ensureHidden(form,name){
    let input=form.querySelector('input[type="hidden"][name="'+name+'"]');
    if(!input){
      input=document.createElement('input');
      input.type='hidden';
      input.name=name;
      form.appendChild(input);
    }
    return input;
  }

  window.pandoraGetCountryCode=function(select){
    if(!select||select.selectedIndex<0)return '';
    const option=select.options[select.selectedIndex];
    if(!option)return '';
    const data=option.dataset||{};
    const fromData=data.code||data.phone||data.dialCode;
    if(fromData)return fromData.charAt(0)==='+'?fromData:'+'+fromData;
    const match=(option.textContent||'').match(/\(\s*(\+\d{1,4})\s*\)/);
    return match?match[1]:'';
  };

  window.pandoraSyncPhoneCode=function(select){
    if(!select)return;
    const form=select.closest('form')||document;
    const code=window.pandoraGetCountryCode(select)||'+?';
    form.querySelectorAll('.phone-code').forEach(input=>{input.value=code});
    window.pandoraPrepareFullPhone(form);
  };

  window.pandoraGetPhoneCodeForInput=function(input){
    if(!input)return '';
    const form=input.closest('form');
    const row=input.closest('.phone-row');
    const codeInput=(row&&row.querySelector('.phone-code'))||(form&&form.querySelector('.phone-code'));
    const code=(codeInput&&(codeInput.value||codeInput.textContent)||'').trim();
    return code&&code!=='+?'?code:'';
  };

  function normalizePhoneForCode(value,code){
    const raw=(value||'').trim();
    if(!raw||/[^\d+\s\-()]/.test(raw))return null;
    let digits=window.normalizePhoneDigits(raw);
    if(!digits)return null;

    if(code==='+380'){
      if(digits.startsWith('380'))digits=digits.slice(3);
      if(digits.startsWith('0')&&digits.length===10)digits=digits.slice(1);
      return digits.length===9?digits:null;
    }
    if(code==='+48'){
      if(digits.startsWith('48')&&digits.length===11)digits=digits.slice(2);
      return digits.length===9?digits:null;
    }
    if(code==='+49'){
      if(digits.startsWith('49'))digits=digits.slice(2);
      return digits.length>=7&&digits.length<=13?digits:null;
    }
    if(code==='+1'){
      if(digits.startsWith('1')&&digits.length===11)digits=digits.slice(1);
      return digits.length===10?digits:null;
    }
    return digits.length>=9&&digits.length<=15?digits:null;
  }

  window.isValidPhoneForCode=function(value,code){
    return normalizePhoneForCode(value,code)!==null;
  };

  function fillCountryOptions(select){
    const countries=window.PANDORA_COUNTRY_OPTIONS||window.COUNTRY_OPTIONS||[];
    if(!select||select.options.length||!countries.length)return;
    countries.forEach(country=>{
      const option=document.createElement('option');
      option.value=country.id||country.code||((country.names&&country.names.en)||'');
      option.dataset.code=country.phoneCode||country.dialCode||country.code||'';
      option.textContent=[country.flag,(country.names&&(country.names[window.getPandoraLang()]||country.names.en||country.names.ru))||country.id,option.dataset.code].filter(Boolean).join(' ');
      select.appendChild(option);
    });
  }

  window.pandoraInitCountryPhone=function(root){
    const scope=root||document;
    scope.querySelectorAll('select[name="country"],select[data-country-options]').forEach(select=>{
      fillCountryOptions(select);
      if(!select.value){
        const ua=Array.from(select.options).find(option=>option.value==='ua'||option.dataset.code==='+380'||/\+380/.test(option.textContent||''));
        if(ua)select.value=ua.value;
      }
      if(!select.dataset.pandoraCountryPhoneBound){
        select.dataset.pandoraCountryPhoneBound='1';
        select.addEventListener('change',()=>window.pandoraSyncPhoneCode(select));
      }
      window.pandoraSyncPhoneCode(select);
    });
  };

  window.pandoraPrepareFullPhone=function(form){
    if(!form)return '';
    const phones=Array.from(form.querySelectorAll('input[type="tel"],input[name="phone"],input[name="phone[]"]'));
    const prepared=phones.map(input=>{
      const code=window.pandoraGetPhoneCodeForInput(input);
      const phone=(input.value||'').trim();
      const normalized=normalizePhoneForCode(phone,code);
      if(!phone)return '';
      if(code&&normalized)return code+' '+normalized;
      return phone;
    }).filter(Boolean);
    const full=form.querySelector('input[name="full_phone"]')||ensureHidden(form,'full_phone');
    full.value=prepared[0]||'';
    const phonesHidden=form.querySelector('input[name="phones"]');
    if(phonesHidden)phonesHidden.value=prepared.join(' | ');
    form.dataset.pandoraFullPhone=prepared[0]||'';
    form.dataset.pandoraPhones=prepared.join(' | ');
    return full.value;
  };

  window.isValidBasicEmail=function(value){
    const email=(value||'').trim();
    if(!email||/\s/.test(email))return false;
    const parts=email.split('@');
    if(parts.length!==2||!parts[0]||!parts[1])return false;
    const domain=parts[1];
    const lastDot=domain.lastIndexOf('.');
    return lastDot>0&&domain.slice(lastDot+1).length>=2;
  };

  window.normalizePhoneDigits=function(value){
    return (value||'').replace(/\D/g,'');
  };

  window.isValidBasicPhone=function(value){
    const raw=(value||'').trim();
    if(!raw)return false;
    if(/[^\d+\s\-()]/.test(raw))return false;
    const digits=window.normalizePhoneDigits(raw);
    return digits.length>=7&&digits.length<=15;
  };

  window.countLinks=function(value){
    return ((value||'').match(/https?:\/\/|www\./gi)||[]).length;
  };

  window.isMeaningfulMessage=function(value){
    const text=(value||'').trim();
    if(!text||text.length>2000)return false;
    const compact=text.replace(/\s+/g,'');
    if(/(.)\1{7,}/u.test(compact))return false;
    const withoutLinks=text.replace(/https?:\/\/\S+|www\.\S+/gi,'');
    const meaningful=withoutLinks.replace(/[^\p{L}\p{N}]+/gu,'');
    const symbolsOnlyRatio=meaningful.length/Math.max(text.length,1);
    return meaningful.length>=10&&symbolsOnlyRatio>=0.18;
  };

  window.validatePandoraEmail=function(input){
    if(!input)return true;
    input.value=(input.value||'').trim();
    clear(input);
    if(!input.value)return setError(input,'emailRequired');
    if(!window.isValidBasicEmail(input.value))return setError(input,'emailInvalid');
    clear(input);
    return true;
  };

  window.validatePandoraPhone=function(input,required){
    if(!input)return !required;
    const value=(input.value||'').trim();
    clear(input);
    if(!value)return required?setError(input,'phoneRequired'):true;
    const code=window.pandoraGetPhoneCodeForInput(input);
    if(!window.isValidPhoneForCode(value,code))return setError(input,'phoneInvalid');
    clear(input);
    return true;
  };

  window.validatePandoraMessage=function(textarea,options){
    if(!textarea)return !(options&&options.required);
    const opts=options||{};
    textarea.value=(textarea.value||'').trim();
    clear(textarea);
    if(!textarea.value)return opts.required?setError(textarea,'messageRequired'):true;
    if(textarea.value.length>2000)return setError(textarea,'messageTooLong');
    if(window.countLinks(textarea.value)>(opts.maxLinks===undefined?1:opts.maxLinks))return setError(textarea,'messageTooManyLinks');
    const compact=textarea.value.replace(/\s+/g,'');
    const withoutLinks=textarea.value.replace(/https?:\/\/\S+|www\.\S+/gi,'');
    const meaningful=withoutLinks.replace(/[^\p{L}\p{N}]+/gu,'');
    const symbolsOnlyRatio=meaningful.length/Math.max(textarea.value.length,1);
    if(/(.)\1{7,}/u.test(compact)||symbolsOnlyRatio<0.18)return setError(textarea,'messageLooksSpam');
    if(meaningful.length<10)return setError(textarea,'messageTooShort');
    clear(textarea);
    return true;
  };

  function ensureStartedAt(form){
    let input=form.querySelector('input[name="form_started_at"]');
    if(!input){
      input=document.createElement('input');
      input.type='hidden';
      input.name='form_started_at';
      form.appendChild(input);
    }
    if(!input.value)input.value=String(Date.now());
    return input;
  }

  window.validatePandoraAntiSpam=function(form,options){
    const opts=options||{};
    const message=form.querySelector('textarea[name="message"],textarea');
    const bot=form.querySelector('input[name="botcheck"]');
    if(bot&&bot.value.trim())return false;
    const started=Number((ensureStartedAt(form).value)||0);
    const minSeconds=opts.minSeconds===undefined?DEFAULT_MIN_SECONDS:opts.minSeconds;
    if(started&&Date.now()-started<minSeconds*1000)return setError(message,'spamTooFast');
    return true;
  };

  window.validatePandoraForm=function(form,options){
    const opts=options||{};
    if(!form)return true;
    window.pandoraPrepareFullPhone(form);
    const email=form.querySelector('input[type="email"],input[name="email"]');
    if(email&&!window.validatePandoraEmail(email))return false;

    const phones=Array.from(form.querySelectorAll('input[type="tel"]'));
    if(opts.phoneRequired&&phones.length&&!window.validatePandoraPhone(phones[0],true))return false;
    for(let i=opts.phoneRequired?1:0;i<phones.length;i++){
      if(phones[i].value.trim()&&!window.validatePandoraPhone(phones[i],false))return false;
    }

    const message=form.querySelector('textarea[name="message"],textarea');
    if(message&&!window.validatePandoraMessage(message,{required:!!opts.messageRequired,maxLinks:opts.maxLinks}))return false;
    if(opts.antiSpam!==false&&!window.validatePandoraAntiSpam(form,opts))return false;
    return true;
  };

  window.initPandoraFormGuards=function(){
    document.querySelectorAll('form').forEach(form=>ensureStartedAt(form));
    window.pandoraInitCountryPhone(document);
    document.querySelectorAll('input[type="email"],input[type="tel"],textarea').forEach(input=>{
      if(input.dataset.pandoraGuardBound)return;
      input.dataset.pandoraGuardBound='1';
      input.addEventListener('input',()=>clear(input));
    });
  };

  document.addEventListener('DOMContentLoaded',window.initPandoraFormGuards);
})();
