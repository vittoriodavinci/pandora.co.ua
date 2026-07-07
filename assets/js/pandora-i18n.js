(function(){
  const STORAGE_SITE_LANG='pandora_lang';
  const STORAGE_SITE_LANG_ALT='pandora-lang';
  const STORAGE_CABINET_LANG='pandora-cabinet-lang';
  const STORAGE_COUNTRY_LIST_LANG='pandora_country_list_lang';

  window.SITE_LANGUAGES=window.PANDORA_SITE_LANGUAGES||window.SITE_LANGUAGES||[];
  window.COUNTRY_OPTIONS=window.PANDORA_COUNTRY_OPTIONS||window.COUNTRY_OPTIONS||[];
  window.COUNTRY_LIST_DISPLAY_LANGUAGES=window.PANDORA_COUNTRY_LIST_DISPLAY_LANGUAGES||window.COUNTRY_LIST_DISPLAY_LANGUAGES||['ru','uk','en','es'];
  window.PANDORA_LANGUAGE_COMMON_I18N=window.PANDORA_LANGUAGE_COMMON_I18N||{};

  function readStorage(key,fallback){
    try{return localStorage.getItem(key)||fallback}catch(e){return fallback}
  }

  function writeSiteLanguage(lang){
    try{
      localStorage.setItem(STORAGE_SITE_LANG,lang);
      localStorage.setItem(STORAGE_SITE_LANG_ALT,lang);
      localStorage.setItem(STORAGE_CABINET_LANG,lang);
    }catch(e){}
  }

  function languageById(langId){
    return window.SITE_LANGUAGES.find(lang=>lang.id===langId);
  }

  function getAvailableSiteLanguages(){
    if(window.CABINET_I18N)return Object.keys(window.CABINET_I18N);
    if(window.faqData)return Object.keys(window.faqData);
    if(window.LANGS)return Object.keys(window.LANGS);
    const found=new Set();
    document.querySelectorAll('[data-lang],[data-lang-panel]').forEach(el=>{
      found.add(el.getAttribute('data-lang')||el.getAttribute('data-lang-panel'));
    });
    return found.size?Array.from(found):['uk','ru','en','es'];
  }

  function resolveSiteLanguage(langId){
    const available=getAvailableSiteLanguages();
    const lang=languageById(langId);
    if(lang&&lang.status==='active'&&available.includes(langId))return langId;
    if(available.includes('en'))return 'en';
    if(available.includes('ru'))return 'ru';
    return available[0]||'uk';
  }

  window.getCountryName=function(country,displayLang){
    const safe=window.COUNTRY_LIST_DISPLAY_LANGUAGES.includes(displayLang)?displayLang:'en';
    return country.names[safe]||country.names.en||country.names.ru||country.id;
  };

  window.getLanguageLabel=function(langId,displayLang){
    const lang=languageById(langId);
    if(!lang)return langId.toUpperCase();
    const safe=window.COUNTRY_LIST_DISPLAY_LANGUAGES.includes(displayLang)?displayLang:'en';
    return (lang.labels&&lang.labels[safe])||lang.nativeLabel||lang.id.toUpperCase();
  };

  window.applySiteLanguage=function(langId){
    const requested=(langId||'uk').toLowerCase();
    const lang=resolveSiteLanguage(requested);

    const runTranslator=(fnName)=>{
      if(typeof window[fnName]==='function'){
        try{
          window[fnName](lang);
          return true;
        }catch(e){
          console.warn('Pandora i18n: '+fnName+' failed',e);
        }
      }
      return false;
    };

    const used =
      runTranslator('applyCabinetLang') ||
      runTranslator('setFaqLang') ||
      runTranslator('setLang');

    if(!used){
      document.querySelectorAll('[data-lang]').forEach(el=>{
        el.classList.toggle('active',el.getAttribute('data-lang')===lang);
      });
      document.querySelectorAll('[data-lang-panel]').forEach(el=>{
        el.classList.toggle('active',el.getAttribute('data-lang-panel')===lang);
      });
    }

    document.documentElement.lang=lang;
    updateLanguageTrigger(lang);
    writeSiteLanguage(lang);
    return lang;
  };
  window.setSiteLanguage=function(langId){
    const applied=window.applySiteLanguage(langId);
    writeSiteLanguage(applied);
    window.renderLanguageModal();
    if(typeof window.renderCountryOptions==='function')window.renderCountryOptions();
    if(typeof window.refreshPhoneRemoveButtons==='function'){
      document.querySelectorAll('form').forEach(form=>window.refreshPhoneRemoveButtons(form));
    }
    updateLanguageTrigger(applied);
    window.closeLanguageModal();
    return applied;
  };

  window.setCountryListDisplayLanguage=function(langId){
    const safe=window.COUNTRY_LIST_DISPLAY_LANGUAGES.includes(langId)?langId:'en';
    try{localStorage.setItem(STORAGE_COUNTRY_LIST_LANG,safe)}catch(e){}
    window.renderCountryOptions();
    window.renderLanguageModal();
  };

  window.renderCountryOptions=function(){
    const selects=document.querySelectorAll('select[data-country-options],#countrySelect');
    if(!selects.length)return;
    const displayLang=readStorage(STORAGE_COUNTRY_LIST_LANG,readStorage(STORAGE_SITE_LANG,'uk'));
    const common=window.PANDORA_LANGUAGE_COMMON_I18N||{};
    const chooseText=(common[displayLang]&&common[displayLang].choose)||(common.en&&common.en.choose)||'Choose';
    selects.forEach(select=>{
      const selected=select.value;
      select.innerHTML='<option value="" data-code="+?">'+chooseText+'</option>'+window.COUNTRY_OPTIONS.map(country=>{
        return '<option value="'+country.id+'" data-code="'+country.phoneCode+'">'+country.flag+' '+window.getCountryName(country,displayLang)+' ('+country.phoneCode+')</option>';
      }).join('');
      if(selected)select.value=selected;
      if(!select.value)select.selectedIndex=0;
    });
  };

  window.renderLanguageModal=function(){
    let root=document.getElementById('pandoraLanguageModal');
    if(!root){
      root=document.createElement('div');
      root.id='pandoraLanguageModal';
      root.className='pandora-language-backdrop';
      root.innerHTML='<div class="pandora-language-dialog" role="dialog" aria-modal="true" aria-labelledby="pandoraLanguageTitle"><div class="pandora-language-head"><div><p class="pandora-language-kicker" id="pandoraLanguageKicker"></p><h2 class="pandora-language-title" id="pandoraLanguageTitle"></h2></div><button class="pandora-language-close" type="button" onclick="closeLanguageModal()" aria-label="Close">×</button></div><div class="pandora-country-list" id="pandoraCountryList"></div><div class="pandora-display-lang"><p class="pandora-display-lang-title" id="pandoraDisplayLangTitle"></p><div class="pandora-display-lang-options" id="pandoraDisplayLangOptions"></div></div></div>';
      root.addEventListener('click',event=>{if(event.target===root)window.closeLanguageModal()});
      document.body.appendChild(root);
    }
    const siteLang=resolveSiteLanguage(readStorage(STORAGE_SITE_LANG,'uk'));
    const displayLang=window.COUNTRY_LIST_DISPLAY_LANGUAGES.includes(readStorage(STORAGE_COUNTRY_LIST_LANG,siteLang))?readStorage(STORAGE_COUNTRY_LIST_LANG,siteLang):siteLang;
    const common=window.PANDORA_LANGUAGE_COMMON_I18N||{};
    const copy=common[displayLang]||common.en||{};
    root.querySelector('#pandoraLanguageKicker').textContent=copy.kicker||'Country and language';
    root.querySelector('#pandoraLanguageTitle').textContent=copy.title||'Choose country and language';
    root.querySelector('#pandoraDisplayLangTitle').textContent=copy.display||'Country list display language';
    renderCountryOptionsInModal(root,displayLang,siteLang,copy);
    renderDisplayLanguageOptions(root,displayLang);
    updateLanguageTrigger(siteLang);
  };

  function renderCountryOptionsInModal(root,displayLang,siteLang,copy){
    const list=root.querySelector('#pandoraCountryList');
    const columns=copy.columns||['Country code','Country','Phone code','Languages'];
    const hint=copy.hint||'Choose a language to apply the interface';
    const rawLangHeader=columns[3]||'';
    const langHeaderMatch=rawLangHeader.match(/^(.*?)\s*(\(.*\))$/);
    const langHeader=langHeaderMatch ? (langHeaderMatch[1]+' <span>'+langHeaderMatch[2]+'</span>') : rawLangHeader;
    const head='<div class="pandora-country-row pandora-country-header"><div>'+columns[0]+'</div><div>'+columns[1]+'</div><div>'+columns[2]+'</div><div class="pandora-language-header-inline">'+langHeader+'</div></div>';
    list.innerHTML=head+window.COUNTRY_OPTIONS.map(country=>{
      const langs=country.languages.map(langId=>{
        const lang=languageById(langId)||{status:'planned'};
        const status=lang.status&&lang.status!=='active'?'<span class="pandora-lang-status">'+lang.status.toUpperCase()+'</span>':'';
        return '<button class="pandora-country-lang '+(lang.status||'planned')+(siteLang===langId?' active':'')+'" type="button" data-site-lang="'+langId+'">'+window.getLanguageLabel(langId,displayLang)+status+'</button>';
      }).join('');
      return '<div class="pandora-country-row"><div class="pandora-country-iso">'+country.id.toUpperCase()+'</div><div class="pandora-country-name"><span class="pandora-country-flag" aria-hidden="true">'+country.flag+'</span>'+window.getCountryName(country,displayLang)+'</div><div class="pandora-country-code">'+country.phoneCode+'</div><div class="pandora-language-list">'+langs+'</div></div>';
    }).join('');
    list.querySelectorAll('[data-site-lang]').forEach(btn=>{
      btn.addEventListener('click',()=>window.setSiteLanguage(btn.getAttribute('data-site-lang')));
    });
  }

  function renderDisplayLanguageOptions(root,displayLang){
    const wrap=root.querySelector('#pandoraDisplayLangOptions');
    wrap.innerHTML=window.COUNTRY_LIST_DISPLAY_LANGUAGES.map(langId=>{
      return '<button class="pandora-display-lang-btn '+(displayLang===langId?'active':'')+'" type="button" data-display-lang="'+langId+'">'+window.getLanguageLabel(langId,displayLang)+'</button>';
    }).join('');
    wrap.querySelectorAll('[data-display-lang]').forEach(btn=>{
      btn.addEventListener('click',()=>window.setCountryListDisplayLanguage(btn.getAttribute('data-display-lang')));
    });
  }

  window.openLanguageModal=function(){
    window.renderLanguageModal();
    const root=document.getElementById('pandoraLanguageModal');
    root.classList.add('open');
    document.body.classList.add('pandora-language-modal-open');
    const btn=document.getElementById('langBtn');
    if(btn){btn.classList.add('open');btn.setAttribute('aria-expanded','true')}
  };

  window.closeLanguageModal=function(){
    const root=document.getElementById('pandoraLanguageModal');
    if(root)root.classList.remove('open');
    document.body.classList.remove('pandora-language-modal-open');
    const btn=document.getElementById('langBtn');
    if(btn){btn.classList.remove('open');btn.setAttribute('aria-expanded','false')}
  };

  window.toggleLangMenu=function(){window.openLanguageModal()};
  window.selectLang=function(lang){window.setSiteLanguage(lang)};

  function updateLanguageTrigger(lang){
    const btn=document.getElementById('langBtn');
    if(!btn)return;
    const code=lang.toUpperCase();
    if(btn.classList.contains('nav-icon-btn')){
      btn.setAttribute('aria-label','Language: '+code);
      return;
    }
    const langData=languageById(lang);
    btn.innerHTML='<span class="pandora-lang-trigger-icon">🌐</span><span class="pandora-lang-trigger-code">'+code+'</span><span class="lang-arrow">▾</span>';
    btn.setAttribute('aria-label',(langData&&langData.nativeLabel?langData.nativeLabel:'Language')+' language menu');
  }

  function ensureLanguageTrigger(){
    let btn=document.getElementById('langBtn');
    if(btn)return;
    const topbar=document.querySelector('.topbar');
    if(!topbar)return;
    const wrap=document.createElement('div');
    wrap.className='nav-lang';
    wrap.id='langSwitcher';
    wrap.innerHTML='<button class="pandora-lang-trigger" id="langBtn" type="button" onclick="openLanguageModal()" aria-haspopup="dialog" aria-expanded="false"></button>';
    topbar.appendChild(wrap);
  }


  /* Pandora language modal delegated click fix */
  if(!window.__pandoraLanguageModalDelegated){
    window.__pandoraLanguageModalDelegated=true;
    document.addEventListener('click',function(event){
      const siteBtn = event.target && event.target.closest ? event.target.closest('#pandoraLanguageModal [data-site-lang]') : null;
      if(siteBtn){
        event.preventDefault();
        event.stopImmediatePropagation();
        window.setSiteLanguage(siteBtn.getAttribute('data-site-lang'));
        return;
      }

      const displayBtn = event.target && event.target.closest ? event.target.closest('#pandoraLanguageModal [data-display-lang]') : null;
      if(displayBtn){
        event.preventDefault();
        event.stopImmediatePropagation();
        window.setCountryListDisplayLanguage(displayBtn.getAttribute('data-display-lang'));
      }
    },true);
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape')window.closeLanguageModal()});

  document.addEventListener('DOMContentLoaded',()=>{
    ensureLanguageTrigger();
    const saved=readStorage(STORAGE_SITE_LANG,readStorage(STORAGE_SITE_LANG_ALT,'uk'));
    const applied=window.applySiteLanguage(saved);
    writeSiteLanguage(applied);
    if(!readStorage(STORAGE_COUNTRY_LIST_LANG,'')){
      try{localStorage.setItem(STORAGE_COUNTRY_LIST_LANG,applied)}catch(e){}
    }
    window.renderCountryOptions();
    window.renderLanguageModal();
  });
})();
