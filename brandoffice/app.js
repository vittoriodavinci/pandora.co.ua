const STORAGE_KEYS = {
  properties: "brandOfficeUa.properties.v1",
  calls: "brandOfficeUa.calls.v1",
  submissions: "bo_owner_submissions"
};

const UZHHOROD_CENTER = [48.6208, 22.2879];

const translations = {
  ua: {
    brandSub: "Агентство нерухомості",
    navCatalog: "Каталог",
    navMap: "Мапа",
    navSubmit: "Запропонувати об'єкт",
    navContacts: "Контакти",
    navWorkbox: "Кабінет",
    heroEyebrow: "ОБ'ЄКТИ ДЛЯ ЖИТТЯ ТА БІЗНЕСУ",
    heroLead: "Агентство нерухомості в Ужгороді",
    heroCopy: "Продаж, оренда та супровід нерухомості. Допоможемо знайти, продати або здати об'єкт без хаосу та зайвих ризиків.",
    heroCatalog: "Каталог об'єктів",
    heroMap: "Об'єкти на мапі",
    heroSubmit: "Запропонувати об'єкт",
    call: "Подзвонити",
    heroPanelLabel: "Агентство в Ужгороді",
    city: "Ужгород",
    metricObjects: "об'єкти",
    metricMap: "на мапі",
    metricRequests: "заявок сьогодні",
    metricOnline: "онлайн",
    heroPanelCopy: "Підбір, продаж і оренда нерухомості з уважним супроводом на кожному етапі.",
    catalogEyebrow: "Вітрина об'єктів",
    catalogTitle: "Каталог об'єктів",
    viewList: "Список",
    viewMap: "На мапі",
    mapEyebrow: "Локації",
    mapTitle: "Об'єкти на мапі Ужгорода",
    mapCopy: "Фільтри каталогу впливають і на список, і на мапу.",
    mapUnavailableTitle: "Мапа недоступна в локальному режимі.",
    mapUnavailableCopy: "Після публікації сайт відкриє інтерактивну карту, якщо доступні зовнішні CDN-ресурси.",
    submitEyebrow: "Заявка від власника",
    submitTitle: "Запропонувати об'єкт",
    submitCopy: "Маєте квартиру, будинок або комерційне приміщення в Ужгороді? Надішліть заявку, фото або голосовий опис. Менеджер BRAND OFFICE UA зв'яжеться з вами, перевірить об'єкт і підготує професійне оголошення.",
    fieldOperation: "Що хочете зробити",
    fieldType: "Тип об'єкта",
    fieldDistrict: "Район",
    fieldAddress: "Адреса",
    fieldPrice: "Орієнтовна ціна",
    fieldCurrency: "Валюта",
    fieldRooms: "Кімнат",
    fieldArea: "Площа",
    fieldFloor: "Поверх",
    fieldCondition: "Стан",
    fieldHeating: "Опалення",
    fieldOwnerName: "Ім'я власника",
    fieldPhone: "Телефон",
    fieldCallTime: "Зручний час для дзвінка",
    fieldDocuments: "Документи / право власності",
    fieldComment: "Коментар",
    fieldVoice: "Голосова нотатка / опис",
    fieldPhotos: "Фото",
    coordNote: "Координати можна додати вручну або вибрати точку на мапі у наступній версії.",
    voiceButton: "Надиктувати опис",
    voiceStatus: "Web Speech API буде використано, якщо доступний у браузері.",
    voiceUnavailable: "Голосове введення недоступне в цьому браузері. Введіть опис текстом.",
    voiceListening: "Слухаю українською...",
    voiceDone: "Опис додано до заявки.",
    voiceError: "Не вдалося розпізнати голос. Можна ввести опис текстом.",
    submitButton: "Надіслати заявку",
    submitSuccess: "Заявку надіслано. Менеджер зв'яжеться з вами, уточнить деталі та домовиться про огляд об'єкта.",
    contactsEyebrow: "Контакти",
    contactsTitle: "Зв'язатися з BRAND OFFICE UA",
    contactPhone: "Телефон",
    contactWrite: "Написати",
    footerText: "Агентство нерухомості в Ужгороді",
    filterAll: "Усі",
    filterSale: "Продаж",
    filterRent: "Оренда",
    filterApartment: "Квартира",
    filterHouse: "Будинок",
    filterCommercial: "Комерція",
    roomsShort: "кімн.",
    areaShort: "м2",
    floorLabel: "поверх",
    noCoords: "координати не вказані",
    defaultCity: "Ужгород",
    defaultOperation: "Операція",
    defaultObject: "Об'єкт",
    defaultDescription: "Деталі об'єкта можна уточнити у менеджера BRAND OFFICE UA.",
    statusAvailable: "Актуально",
    details: "Детальніше",
    requestSentToast: "Заявку надіслано",
    operationOptions: ["Продати", "Здати в оренду"],
    typeOptions: ["Квартира", "Будинок", "Земля", "Комерція"],
    phDistrict: "Центр, Боздош, Новий район",
    phAddress: "Вулиця, будинок",
    phCondition: "Житловий, ремонт, після забудовника",
    phHeating: "Індивідуальне, електричне, центральне",
    phOwner: "Олена",
    phMessenger: "@username або номер",
    phCallTime: "Після 18:00",
    phDocuments: "Наприклад: право власності, спадщина, довіреність",
    phComment: "Що важливо знати менеджеру",
    phVoice: "Можна ввести текст або надиктувати опис українською"
  },
  ru: {
    brandSub: "Агентство недвижимости",
    navCatalog: "Каталог",
    navMap: "Карта",
    navSubmit: "Предложить объект",
    navContacts: "Контакты",
    navWorkbox: "Кабинет",
    heroEyebrow: "ОБЪЕКТЫ ДЛЯ ЖИЗНИ И БИЗНЕСА",
    heroLead: "Агентство недвижимости в Ужгороде",
    heroCopy: "Продажа, аренда и сопровождение недвижимости. Поможем найти, продать или сдать объект без хаоса и лишних рисков.",
    heroCatalog: "Каталог объектов",
    heroMap: "Объекты на карте",
    heroSubmit: "Предложить объект",
    call: "Позвонить",
    heroPanelLabel: "Агентство в Ужгороде",
    city: "Ужгород",
    metricObjects: "объекта",
    metricMap: "на карте",
    metricRequests: "заявок сегодня",
    metricOnline: "онлайн",
    heroPanelCopy: "Подбор, продажа и аренда недвижимости с внимательным сопровождением на каждом этапе.",
    catalogEyebrow: "Витрина объектов",
    catalogTitle: "Каталог объектов",
    viewList: "Список",
    viewMap: "На карте",
    mapEyebrow: "Локации",
    mapTitle: "Объекты на карте Ужгорода",
    mapCopy: "Фильтры каталога влияют и на список, и на карту.",
    mapUnavailableTitle: "Карта недоступна в локальном режиме.",
    mapUnavailableCopy: "После публикации сайт откроет интерактивную карту, если доступны внешние CDN-ресурсы.",
    submitEyebrow: "Заявка от собственника",
    submitTitle: "Предложить объект",
    submitCopy: "Есть квартира, дом или коммерческое помещение в Ужгороде? Отправьте заявку, фото или голосовое описание. Менеджер BRAND OFFICE UA свяжется с вами, проверит объект и подготовит профессиональное объявление.",
    fieldOperation: "Что хотите сделать",
    fieldType: "Тип объекта",
    fieldDistrict: "Район",
    fieldAddress: "Адрес",
    fieldPrice: "Ориентировочная цена",
    fieldCurrency: "Валюта",
    fieldRooms: "Комнат",
    fieldArea: "Площадь",
    fieldFloor: "Этаж",
    fieldCondition: "Состояние",
    fieldHeating: "Отопление",
    fieldOwnerName: "Имя собственника",
    fieldPhone: "Телефон",
    fieldCallTime: "Удобное время для звонка",
    fieldDocuments: "Документы / право собственности",
    fieldComment: "Комментарий",
    fieldVoice: "Голосовая заметка / описание",
    fieldPhotos: "Фото",
    coordNote: "Координаты можно добавить вручную или выбрать точку на карте в следующей версии.",
    voiceButton: "Надиктовать описание",
    voiceStatus: "Web Speech API будет использован, если доступен в браузере.",
    voiceUnavailable: "Голосовой ввод недоступен в этом браузере. Введите описание текстом.",
    voiceListening: "Слушаю на украинском...",
    voiceDone: "Описание добавлено в заявку.",
    voiceError: "Не удалось распознать голос. Можно ввести описание текстом.",
    submitButton: "Отправить заявку",
    submitSuccess: "Заявка отправлена. Менеджер свяжется с вами, уточнит детали и договорится об осмотре объекта.",
    contactsEyebrow: "Контакты",
    contactsTitle: "Связаться с BRAND OFFICE UA",
    contactPhone: "Телефон",
    contactWrite: "Написать",
    footerText: "Агентство недвижимости в Ужгороде",
    filterAll: "Все",
    filterSale: "Продажа",
    filterRent: "Аренда",
    filterApartment: "Квартира",
    filterHouse: "Дом",
    filterCommercial: "Коммерция",
    roomsShort: "комн.",
    areaShort: "м2",
    floorLabel: "этаж",
    noCoords: "координаты не указаны",
    defaultCity: "Ужгород",
    defaultOperation: "Операция",
    defaultObject: "Объект",
    defaultDescription: "Детали объекта можно уточнить у менеджера BRAND OFFICE UA.",
    statusAvailable: "Актуально",
    details: "Подробнее",
    requestSentToast: "Заявка отправлена",
    operationOptions: ["Продать", "Сдать в аренду"],
    typeOptions: ["Квартира", "Дом", "Земля", "Коммерция"],
    phDistrict: "Центр, Боздош, Новый район",
    phAddress: "Улица, дом",
    phCondition: "Жилое, ремонт, после застройщика",
    phHeating: "Индивидуальное, электрическое, центральное",
    phOwner: "Елена",
    phMessenger: "@username или номер",
    phCallTime: "После 18:00",
    phDocuments: "Например: право собственности, наследство, доверенность",
    phComment: "Что важно знать менеджеру",
    phVoice: "Можно ввести текст или надиктовать описание"
  },
  en: {
    brandSub: "Real estate agency",
    navCatalog: "Catalog",
    navMap: "Map",
    navSubmit: "Submit a property",
    navContacts: "Contacts",
    navWorkbox: "Workbox",
    heroEyebrow: "PROPERTIES FOR LIFE AND BUSINESS",
    heroLead: "Real estate agency in Uzhhorod",
    heroCopy: "Sales, rentals and real estate support. We help clients find, sell or rent properties with a clear and organized process.",
    heroCatalog: "Property catalog",
    heroMap: "Properties on map",
    heroSubmit: "Submit a property",
    call: "Call",
    heroPanelLabel: "Agency in Uzhhorod",
    city: "Uzhhorod",
    metricObjects: "properties",
    metricMap: "on map",
    metricRequests: "requests today",
    metricOnline: "online",
    heroPanelCopy: "Property search, sales and rentals with careful support at every step.",
    catalogEyebrow: "Property showcase",
    catalogTitle: "Property catalog",
    viewList: "List",
    viewMap: "On map",
    mapEyebrow: "Locations",
    mapTitle: "Properties on the Uzhhorod map",
    mapCopy: "Catalog filters affect both the list and the map.",
    mapUnavailableTitle: "Map is unavailable in local mode.",
    mapUnavailableCopy: "After publishing, the site will open the interactive map if external CDN resources are available.",
    submitEyebrow: "Owner request",
    submitTitle: "Submit a property",
    submitCopy: "Have an apartment, house or commercial property in Uzhhorod? Send a request, photos or a voice description. A BRAND OFFICE UA manager will contact you, verify the property and prepare a professional listing.",
    fieldOperation: "What would you like to do",
    fieldType: "Property type",
    fieldDistrict: "District",
    fieldAddress: "Address",
    fieldPrice: "Approximate price",
    fieldCurrency: "Currency",
    fieldRooms: "Rooms",
    fieldArea: "Area",
    fieldFloor: "Floor",
    fieldCondition: "Condition",
    fieldHeating: "Heating",
    fieldOwnerName: "Owner name",
    fieldPhone: "Phone",
    fieldCallTime: "Convenient call time",
    fieldDocuments: "Documents / ownership",
    fieldComment: "Comment",
    fieldVoice: "Voice note / description",
    fieldPhotos: "Photos",
    coordNote: "Coordinates can be added manually or selected on the map in the next version.",
    voiceButton: "Dictate description",
    voiceStatus: "Web Speech API will be used if available in your browser.",
    voiceUnavailable: "Voice input is not available in this browser. Please type the description.",
    voiceListening: "Listening in Ukrainian...",
    voiceDone: "Description added to the request.",
    voiceError: "Could not recognize speech. You can type the description.",
    submitButton: "Send request",
    submitSuccess: "Your request has been sent. A manager will contact you, clarify the details and arrange a property viewing.",
    contactsEyebrow: "Contacts",
    contactsTitle: "Contact BRAND OFFICE UA",
    contactPhone: "Phone",
    contactWrite: "Message",
    footerText: "Real estate agency in Uzhhorod",
    filterAll: "All",
    filterSale: "Sale",
    filterRent: "Rent",
    filterApartment: "Apartment",
    filterHouse: "House",
    filterCommercial: "Commercial",
    roomsShort: "rooms",
    areaShort: "sqm",
    floorLabel: "floor",
    noCoords: "coordinates not specified",
    defaultCity: "Uzhhorod",
    defaultOperation: "Operation",
    defaultObject: "Property",
    defaultDescription: "Property details can be clarified with a BRAND OFFICE UA manager.",
    statusAvailable: "Available",
    details: "Details",
    requestSentToast: "Request sent",
    operationOptions: ["Sell", "Rent out"],
    typeOptions: ["Apartment", "House", "Land", "Commercial"],
    phDistrict: "Center, Bozdosh, New district",
    phAddress: "Street, building",
    phCondition: "Livable, renovated, from developer",
    phHeating: "Individual, electric, central",
    phOwner: "Olena",
    phMessenger: "@username or number",
    phCallTime: "After 18:00",
    phDocuments: "For example: ownership, inheritance, power of attorney",
    phComment: "What the manager should know",
    phVoice: "Type text or dictate a description"
  }
};

const demoProperties = [
  {
    id: "bo-seed-001",
    code: "BO-2401",
    operation: "Продаж",
    type: "Квартира",
    title: "Продаж 2-кімнатної квартири біля набережної",
    district: "Центр",
    address: "Ужгород, район набережної",
    price: "86 000",
    currency: "$",
    rooms: "2",
    area: "63",
    floor: "3/5",
    heating: "Індивідуальне газове",
    condition: "Готова до проживання",
    status: "Ексклюзив",
    publicDescription: "Світла квартира з продуманим плануванням, балконом та швидким доступом до центру.",
    lat: 48.624,
    lng: 22.296,
    art: "linear-gradient(135deg, #2b2117 0%, #7a5a28 48%, #151515 100%)"
  },
  {
    id: "bo-seed-002",
    code: "BO-2402",
    operation: "Оренда",
    type: "Квартира",
    title: "Оренда 1-кімнатної квартири для пари або спеціаліста",
    district: "Новий район",
    address: "Ужгород, Новий район",
    price: "14 500",
    currency: "грн",
    rooms: "1",
    area: "41",
    floor: "6/9",
    heating: "Центральне",
    condition: "Охайний житловий стан",
    status: "Актуально",
    publicDescription: "Компактна квартира з меблями, технікою та зручною транспортною розв'язкою.",
    lat: 48.606,
    lng: 22.302,
    art: "linear-gradient(135deg, #1f2529 0%, #c29a4c 52%, #0c0c0c 100%)"
  },
  {
    id: "bo-seed-003",
    code: "BO-2403",
    operation: "Продаж",
    type: "Будинок",
    title: "Продаж будинку з подвір'ям у тихій локації",
    district: "Боздош",
    address: "Ужгород, Боздош",
    price: "178 000",
    currency: "$",
    rooms: "4",
    area: "142",
    floor: "2",
    heating: "Автономне",
    condition: "Сучасний ремонт",
    status: "Новинка",
    publicDescription: "Будинок для сім'ї з терасою, місцем для авто та приватним подвір'ям.",
    lat: 48.617,
    lng: 22.265,
    art: "linear-gradient(135deg, #241b13 0%, #4b3720 38%, #dfbd67 100%)"
  },
  {
    id: "bo-seed-004",
    code: "BO-2404",
    operation: "Оренда",
    type: "Комерція",
    title: "Комерційне приміщення під офіс або шоурум",
    district: "Площа Петефі",
    address: "Ужгород, діловий центр",
    price: "1 100",
    currency: "$",
    rooms: "3",
    area: "88",
    floor: "1/4",
    heating: "Електричне",
    condition: "Після ремонту",
    status: "Під бізнес",
    publicDescription: "Фасадний вхід, великі вітрини, прохідний трафік і готовність до роботи.",
    lat: 48.6217,
    lng: 22.2919,
    art: "linear-gradient(135deg, #101010 0%, #6c5229 45%, #d8b15d 100%)"
  }
];

const propertyFilters = ["Усі", "Продаж", "Оренда", "Квартира", "Будинок", "Комерція"];
const callStatuses = ["Усі", "Власник", "Посередник", "Не дозвонились", "Передзвонити", "Неактуально", "Фейк"];
const submissionStatuses = [
  "Нова",
  "Передзвонити",
  "Контакт підтверджено",
  "Потрібен огляд",
  "Огляд заплановано",
  "Готово до публікації",
  "Відхилено",
  "Архів"
];

let selectedPhotos = [];
let ownerSelectedPhotos = [];
let activePropertyFilter = "Усі";
let activeCallStatus = "Усі";
let mapInstance = null;
let mapMarkers = [];

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function getLang() {
  const saved = localStorage.getItem("bo_lang");
  return translations[saved] ? saved : "ua";
}

function t(key) {
  const lang = getLang();
  return translations[lang][key] || translations.ua[key] || key;
}

function applyTranslations() {
  const lang = getLang();
  document.documentElement.lang = lang === "ua" ? "uk" : lang;
  qsa("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  qsa("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  qsa("[data-i18n-options]").forEach((select) => {
    const options = translations[lang][select.dataset.i18nOptions] || translations.ua[select.dataset.i18nOptions] || [];
    [...select.options].forEach((option, index) => {
      if (options[index]) option.textContent = options[index];
    });
  });
  qsa("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });
}

function setupLanguageSwitcher() {
  qsa("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("bo_lang", button.dataset.lang);
      applyTranslations();
      renderAll();
    });
  });
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Cannot parse localStorage item", key, error);
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSeedProperties(properties) {
  const byId = new Map(properties.map((property) => [property.id, property]));
  demoProperties.forEach((seed) => {
    const current = byId.get(seed.id);
    if (!current) {
      properties.push(seed);
      return;
    }
    byId.set(seed.id, { ...seed, ...current, lat: current.lat || seed.lat, lng: current.lng || seed.lng });
  });
  return properties.map((property) => byId.get(property.id) || property);
}

function getProperties() {
  const saved = loadJson(STORAGE_KEYS.properties, null);
  if (!Array.isArray(saved) || saved.length === 0) {
    saveJson(STORAGE_KEYS.properties, demoProperties);
    return demoProperties;
  }
  const normalized = normalizeSeedProperties(saved);
  saveJson(STORAGE_KEYS.properties, normalized);
  return normalized;
}

function getCalls() {
  return loadJson(STORAGE_KEYS.calls, []);
}

function getSubmissions() {
  return loadJson(STORAGE_KEYS.submissions, []);
}

function formatPrice(property) {
  const price = String(property.price || "").trim();
  const currency = String(property.currency || "").trim();
  return `${price} ${currency}`.trim() || "Ціна за запитом";
}

function getPropertyTitle(property) {
  return property.title || `${property.operation || ""} ${property.type || "об'єкт"} · ${property.district || "Ужгород"}`.trim();
}

function getPhotoStyle(property) {
  if (property.photos && property.photos[0]) {
    return `background-image: url("${property.photos[0]}")`;
  }
  return `--art: ${property.art || "linear-gradient(135deg, #2d2419, #0d0d0d)"}`;
}

function filterProperties(properties) {
  if (activePropertyFilter === propertyFilters[0]) return properties;
  return properties.filter((property) => property.operation === activePropertyFilter || property.type === activePropertyFilter);
}

function hasCoordinates(property) {
  return Number.isFinite(Number(property.lat)) && Number.isFinite(Number(property.lng));
}

function renderPropertyFilters() {
  const root = qs("#propertyFilters");
  if (!root) return;
  const labels = ["filterAll", "filterSale", "filterRent", "filterApartment", "filterHouse", "filterCommercial"];
  root.innerHTML = propertyFilters
    .map((filter, index) => `<button class="chip ${filter === activePropertyFilter ? "active" : ""}" type="button" data-property-filter="${filter}">${t(labels[index])}</button>`)
    .join("");
}

function renderCatalog() {
  const grid = qs("#catalogGrid");
  if (!grid) return;

  const properties = filterProperties(getProperties());
  grid.innerHTML = properties
    .map((property) => `
      <article class="property-card">
        <div class="property-art" style="${getPhotoStyle(property)}" data-code="${property.code || ""}"></div>
        <div class="property-body">
          <div class="property-meta">
            <span>${property.operation || t("defaultOperation")}</span>
            <span>${property.type || t("defaultObject")}</span>
            <span>${property.district || t("defaultCity")}</span>
          </div>
          <h3>${getPropertyTitle(property)}</h3>
          <div class="price">${formatPrice(property)}</div>
          <div class="mini-meta">
            <span>${property.rooms || "-"} ${t("roomsShort")}</span>
            <span>${property.area || "-"} ${t("areaShort")}</span>
            <span>${property.floor || "-"} ${t("floorLabel")}</span>
            <span>${hasCoordinates(property) ? `${property.lat}, ${property.lng}` : t("noCoords")}</span>
          </div>
          <p>${property.publicDescription || t("defaultDescription")}</p>
          <span class="status-badge">${t("statusAvailable")} · ${property.code || "BO-new"}</span>
          <button class="btn dark" type="button" data-details="${property.id}">${t("details")}</button>
        </div>
      </article>
    `)
    .join("");

  qs("#heroObjectsCount") && (qs("#heroObjectsCount").textContent = getProperties().length);
  qs("#heroMapCount") && (qs("#heroMapCount").textContent = getProperties().filter(hasCoordinates).length);
}

function createPopup(property) {
  return `
    <div class="map-popup">
      <strong>${formatPrice(property)}</strong>
      <div>${property.district || t("defaultCity")} · ${property.type || t("defaultObject")}</div>
      <div>${property.area || "-"} ${t("areaShort")}</div>
      <button class="btn gold" type="button" data-details="${property.id}">${t("details")}</button>
    </div>
  `;
}

function renderFallbackMap(properties) {
  const root = qs("#fallbackMarkers");
  if (!root) return;
  root.innerHTML = properties
    .filter(hasCoordinates)
    .map((property, index) => {
      const left = 18 + ((index * 23) % 64);
      const top = 22 + ((index * 17) % 58);
      return `
        <button class="fallback-marker" type="button" data-details="${property.id}" style="left:${left}%;top:${top}%">
          <span>${property.district || t("defaultCity")} · ${formatPrice(property)}</span>
        </button>
      `;
    })
    .join("");
}

function renderMap() {
  const mapElement = qs("#propertyMap");
  const fallback = qs("#mapFallback");
  if (!mapElement) return;

  const properties = filterProperties(getProperties());
  renderFallbackMap(properties);

  if (!window.L) {
    fallback && fallback.classList.remove("hidden");
    return;
  }

  fallback && fallback.classList.add("hidden");
  if (!mapInstance) {
    mapInstance = L.map(mapElement, { scrollWheelZoom: false }).setView(UZHHOROD_CENTER, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(mapInstance);
  }

  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = properties.filter(hasCoordinates).map((property) => {
    const marker = L.marker([Number(property.lat), Number(property.lng)]).addTo(mapInstance);
    marker.bindPopup(createPopup(property));
    return marker;
  });

  setTimeout(() => mapInstance.invalidateSize(), 80);
}

function setCatalogView(view) {
  qsa("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  qsa("[data-catalog-view]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.catalogView === view);
  });
}

function openMapView() {
  const catalog = qs("#catalog");
  setCatalogView("map");
  renderMap();
  if (catalog) {
    catalog.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 260);
  }
}

function renderOfficeObjects() {
  const list = qs("#officeObjects");
  const count = qs("#objectsCount");
  if (!list) return;

  const properties = getProperties();
  count.textContent = `${properties.length} записів`;
  list.innerHTML = properties
    .map((property) => `
      <article class="object-row">
        <div class="object-thumb" style="${getPhotoStyle(property)}"></div>
        <div>
          <h4>${getPropertyTitle(property)}</h4>
          <div class="mini-meta">
            <span>${property.code || "BO-new"}</span>
            <span>${property.status || "В роботі"}</span>
            <span>${property.operation || "-"}</span>
            <span>${property.type || "-"}</span>
            <span>${property.district || "-"}</span>
            <span>${formatPrice(property)}</span>
            <span>${hasCoordinates(property) ? `${property.lat}, ${property.lng}` : "без координат"}</span>
          </div>
          <p>${property.privateComment || property.publicDescription || "Без внутрішнього коментаря."}</p>
        </div>
        <span class="status-badge">${property.status || "В роботі"}</span>
      </article>
    `)
    .join("");
}

function renderCalls() {
  const list = qs("#callList");
  const count = qs("#callsCount");
  if (!list) return;

  const calls = getCalls();
  const filtered = activeCallStatus === "Усі" ? calls : calls.filter((call) => call.status === activeCallStatus);
  count.textContent = `${calls.length} записів`;
  list.innerHTML = filtered.length
    ? filtered.map((call) => `
      <article class="call-card">
        <header>
          <div>
            <h4>${call.name || "Без імені"}</h4>
            <div class="mini-meta">
              <span>${call.phone || "-"}</span>
              <span>${call.source || "Джерело не вказано"}</span>
              <span>${call.nextDate ? `Наступний контакт: ${call.nextDate}` : "Без дати"}</span>
            </div>
          </div>
          <span class="status-badge">${call.status || "В роботі"}</span>
        </header>
        <p>${call.comment || "Коментар не додано."}</p>
        ${call.link ? `<p>${call.link}</p>` : ""}
      </article>
    `).join("")
    : `<div class="archive-empty"><strong>Записів поки немає</strong><p>Додайте перший прозвон або змініть фільтр статусу.</p></div>`;
}

function renderCallFilters() {
  const root = qs("#callFilters");
  if (!root) return;
  root.innerHTML = callStatuses
    .map((status) => `<button class="chip ${status === activeCallStatus ? "active" : ""}" type="button" data-call-status="${status}">${status}</button>`)
    .join("");
}

function renderDashboard() {
  const submissions = getSubmissions();
  const properties = getProperties();
  const today = new Date().toISOString().slice(0, 10);
  const submissionsToday = submissions.filter((item) => String(item.createdAt || "").slice(0, 10) === today).length;
  qs("#dashNewSubmissions") && (qs("#dashNewSubmissions").textContent = submissions.filter((item) => item.status === "Нова").length);
  qs("#dashReviewObjects") && (qs("#dashReviewObjects").textContent = properties.filter((item) => ["Чернетка", "На перевірці"].includes(item.status)).length);
  qs("#dashScheduledViews") && (qs("#dashScheduledViews").textContent = submissions.filter((item) => item.status === "Огляд заплановано").length);
  qs("#heroSubmissionsCount") && (qs("#heroSubmissionsCount").textContent = submissionsToday);
}

function renderOwnerSubmissions() {
  const list = qs("#ownerSubmissionsList");
  const count = qs("#submissionsCount");
  if (!list) return;

  const submissions = getSubmissions();
  count.textContent = `${submissions.length} заявок`;
  list.innerHTML = submissions.length
    ? submissions.map((item) => `
      <article class="submission-card">
        <div>
          <h4>${item.operation || "Заявка"} · ${item.type || "Об'єкт"} · ${item.district || "Ужгород"}</h4>
          <div class="mini-meta">
            <span>${item.status || "Нова"}</span>
            <span>${formatPrice(item)}</span>
            <span>${item.area || "-"} м2</span>
            <span>${item.rooms || "-"} кімн.</span>
            <span>${item.phone || "телефон не вказано"}</span>
          </div>
          <p>${item.comment || item.voiceNote || "Коментар власника не додано."}</p>
          ${item.documents ? `<p>Документи: ${item.documents}</p>` : ""}
          ${item.voiceNote ? `<p>Голосова нотатка: ${item.voiceNote}</p>` : ""}
          <div class="submission-photos">
            ${(item.photos || []).map((photo) => `<img src="${photo}" alt="Фото заявки" />`).join("")}
          </div>
        </div>
        <div class="submission-actions">
          <label>Статус заявки
            <select data-submission-status="${item.id}">
              ${submissionStatuses.map((status) => `<option ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label>Внутрішній коментар менеджера
            <textarea data-manager-comment="${item.id}" placeholder="Результат дзвінка, домовленість про огляд">${item.managerComment || ""}</textarea>
          </label>
          <button class="btn gold" type="button" data-create-from-submission="${item.id}">Створити об'єкт з заявки</button>
          <button class="btn dark" type="button" data-archive-submission="${item.id}">В архів</button>
        </div>
      </article>
    `).join("")
    : `<div class="archive-empty"><strong>Заявок поки немає</strong><p>Коли власник відправить форму на публічній сторінці, заявка з'явиться тут.</p></div>`;
}

function collectForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function createObjectCode() {
  return `BO-${String(Date.now()).slice(-5)}`;
}

function showToast(message) {
  const old = qs(".toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2400);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function switchTab(tabName) {
  qsa(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  qsa(".workspace-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tabName));
}

function setupTabs() {
  qsa(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  qsa('a[href="#submissions"], a[href="#add-object"], a[href="#calls"], a[href="#generator"]').forEach((link) => {
    link.addEventListener("click", () => {
      const tab = link.getAttribute("href").replace("#", "");
      setTimeout(() => switchTab(tab), 50);
    });
  });
}

function setupViewToggle() {
  qsa("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      setCatalogView(view);
      if (view === "map") renderMap();
    });
  });
}

function setupOpenMapLinks() {
  qsa("[data-open-map]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openMapView();
      history.replaceState(null, "", "#catalog");
    });
  });
}

function openMapFromHash() {
  if (["#map-section", "#map", "#catalog-map"].includes(location.hash)) {
    setTimeout(openMapView, 120);
  }
}

function setupPhotoPreview(inputSelector, previewSelector, target) {
  const input = qs(inputSelector);
  const preview = qs(previewSelector);
  if (!input || !preview) return;

  input.addEventListener("change", () => {
    target.length = 0;
    preview.innerHTML = "";
    [...input.files].slice(0, 8).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        target.push(reader.result);
        const img = document.createElement("img");
        img.src = reader.result;
        img.alt = file.name;
        preview.append(img);
      };
      reader.readAsDataURL(file);
    });
  });
}

function setupObjectForm() {
  const form = qs("#objectForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = collectForm(form);
    const properties = getProperties();
    properties.unshift({
      id: `bo-${Date.now()}`,
      code: createObjectCode(),
      status: data.status || "В роботі",
      photos: selectedPhotos,
      title: `${data.operation} · ${data.type} · ${data.district}`,
      ...data
    });
    saveJson(STORAGE_KEYS.properties, properties);
    form.reset();
    selectedPhotos = [];
    qs("#photoPreview") && (qs("#photoPreview").innerHTML = "");
    renderAll();
    switchTab("objects");
    showToast("Об'єкт збережено в localStorage");
  });
}

function setupCallForm() {
  const form = qs("#callForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const calls = getCalls();
    calls.unshift({
      id: `call-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...collectForm(form)
    });
    saveJson(STORAGE_KEYS.calls, calls);
    form.reset();
    renderAll();
    showToast("Запис прозвону додано");
  });
}

function setupOwnerSubmissionForm() {
  const form = qs("#ownerSubmissionForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const submissions = getSubmissions();
    submissions.unshift({
      id: `owner-${Date.now()}`,
      status: "Нова",
      createdAt: new Date().toISOString(),
      photos: ownerSelectedPhotos,
      ...collectForm(form)
    });
    saveJson(STORAGE_KEYS.submissions, submissions);
    form.reset();
    ownerSelectedPhotos = [];
    qs("#ownerPhotoPreview").innerHTML = "";
    qs("#ownerSuccess").hidden = false;
    renderDashboard();
    showToast(t("requestSentToast"));
  });
}

function setupVoiceInput() {
  const button = qs("#voiceButton");
  const target = qs("#voiceNote");
  const status = qs("#voiceStatus");
  if (!button || !target) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    status.textContent = t("voiceUnavailable");
    button.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "uk-UA";
  recognition.interimResults = false;
  recognition.continuous = false;

  button.addEventListener("click", () => {
    status.textContent = t("voiceListening");
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const text = [...event.results].map((result) => result[0].transcript).join(" ");
    target.value = `${target.value ? `${target.value}\n` : ""}${text}`;
    status.textContent = t("voiceDone");
  });

  recognition.addEventListener("error", () => {
    status.textContent = t("voiceError");
  });
}

function updateSubmission(id, patch) {
  const submissions = getSubmissions().map((item) => (item.id === id ? { ...item, ...patch } : item));
  saveJson(STORAGE_KEYS.submissions, submissions);
  renderAll();
}

function createPropertyFromSubmission(id) {
  const submission = getSubmissions().find((item) => item.id === id);
  if (!submission) return;

  const properties = getProperties();
  properties.unshift({
    id: `bo-${Date.now()}`,
    code: createObjectCode(),
    operation: submission.operation === "Здати в оренду" ? "Оренда" : "Продаж",
    type: submission.type,
    title: `${submission.operation} · ${submission.type} · ${submission.district}`,
    district: submission.district,
    address: submission.address,
    price: submission.price,
    currency: submission.currency,
    rooms: submission.rooms,
    area: submission.area,
    floor: submission.floor,
    heating: submission.heating,
    condition: submission.condition,
    lat: submission.lat,
    lng: submission.lng,
    owner: submission.ownerName,
    ownerPhone: submission.phone,
    publicDescription: submission.comment || submission.voiceNote || "",
    privateComment: `Створено із заявки власника. ${submission.managerComment || ""}`.trim(),
    photos: submission.photos || [],
    status: "Чернетка",
    sourceSubmissionId: id
  });
  saveJson(STORAGE_KEYS.properties, properties);
  updateSubmission(id, { status: "Готово до публікації" });
  switchTab("objects");
  showToast("Чернетку об'єкта створено із заявки");
}

function setupFiltersAndActions() {
  document.addEventListener("click", (event) => {
    const propertyFilter = event.target.closest("[data-property-filter]");
    if (propertyFilter) {
      activePropertyFilter = propertyFilter.dataset.propertyFilter;
      renderPropertyFilters();
      renderCatalog();
      renderMap();
    }

    const callFilter = event.target.closest("[data-call-status]");
    if (callFilter) {
      activeCallStatus = callFilter.dataset.callStatus;
      renderCallFilters();
      renderCalls();
    }

    const detailsButton = event.target.closest("[data-details]");
    if (detailsButton) {
      const property = getProperties().find((item) => item.id === detailsButton.dataset.details);
      if (property) showToast(`${property.code || "BO"}: ${property.district || "Ужгород"}, ${formatPrice(property)}`);
    }

    const createButton = event.target.closest("[data-create-from-submission]");
    if (createButton) {
      createPropertyFromSubmission(createButton.dataset.createFromSubmission);
    }

    const archiveButton = event.target.closest("[data-archive-submission]");
    if (archiveButton) {
      updateSubmission(archiveButton.dataset.archiveSubmission, { status: "Архів" });
      showToast("Заявку перенесено в архів");
    }
  });

  document.addEventListener("change", (event) => {
    const statusSelect = event.target.closest("[data-submission-status]");
    if (statusSelect) {
      updateSubmission(statusSelect.dataset.submissionStatus, { status: statusSelect.value });
      showToast("Статус заявки оновлено");
    }
  });

  document.addEventListener("input", (event) => {
    const commentField = event.target.closest("[data-manager-comment]");
    if (commentField) {
      const submissions = getSubmissions().map((item) =>
        item.id === commentField.dataset.managerComment ? { ...item, managerComment: commentField.value } : item
      );
      saveJson(STORAGE_KEYS.submissions, submissions);
      renderDashboard();
    }
  });
}

function getGeneratorValue(data, key, fallback) {
  return String(data[key] || fallback).trim();
}

function buildGeneratedTexts(data) {
  const operation = getGeneratorValue(data, "operation", "Продаж");
  const type = getGeneratorValue(data, "type", "об'єкт нерухомості");
  const district = getGeneratorValue(data, "district", "Ужгород");
  const area = getGeneratorValue(data, "area", "площа уточнюється");
  const rooms = getGeneratorValue(data, "rooms", "кількість кімнат уточнюється");
  const price = getGeneratorValue(data, "price", "ціна за запитом");
  const condition = getGeneratorValue(data, "condition", "житловий стан");
  const benefits = getGeneratorValue(data, "benefits", "зручна локація, практичне планування, готовність до перегляду");
  const contact = getGeneratorValue(data, "contact", "066 56 56 560");

  // TODO: AI listing generation API
  return [
    {
      title: "Опис для сайту",
      text: `${operation}: ${type} у районі ${district}. Площа: ${area}, кімнат: ${rooms}. Стан: ${condition}. Основні переваги: ${benefits}. Вартість: ${price}. Для перегляду звертайтесь у BRAND OFFICE UA: ${contact}.`
    },
    {
      title: "Текст для OLX / DIM.RIA",
      text: `${operation} ${type}, ${district}. ${area}, ${rooms} кімн. ${condition}. ${benefits}. Ціна: ${price}. Телефонуйте: ${contact}. BRAND OFFICE UA, Ужгород.`
    },
    {
      title: "Пост Instagram",
      text: `BRAND OFFICE UA представляє: ${type} у локації ${district}. ${area}, ${rooms} кімн., ${condition}. Переваги: ${benefits}. Ціна: ${price}. Запис на перегляд: ${contact}. #brandofficeua #нерухомістьужгород #ужгород`
    },
    {
      title: "Сценарій TikTok / Reels",
      text: `Кадр 1: район ${district}. Текст: "${operation} ${type}". Кадр 2: планування, ${area}, ${rooms} кімн. Кадр 3: стан - ${condition}. Кадр 4: переваги - ${benefits}. Фінал: "BRAND OFFICE UA, перегляд за номером ${contact}, ціна ${price}".`
    },
    {
      title: "Короткий пост Telegram",
      text: `${operation} ${type} | ${district}\nПлоща: ${area}\nКімнат: ${rooms}\nСтан: ${condition}\nПлюси: ${benefits}\nЦіна: ${price}\nКонтакт: ${contact}`
    }
  ];
}

function renderGeneratedTexts(items) {
  const root = qs("#generatedList");
  if (!root) return;

  root.innerHTML = items
    .map((item, index) => `
      <article class="generated-card">
        <header>
          <h4>${item.title}</h4>
          <button class="btn dark" type="button" data-copy="${index}">Скопіювати</button>
        </header>
        <textarea readonly>${item.text}</textarea>
      </article>
    `)
    .join("");

  qsa("[data-copy]", root).forEach((button) => {
    button.addEventListener("click", async () => {
      const text = items[Number(button.dataset.copy)].text;
      await copyText(text);
      showToast("Текст скопійовано");
    });
  });
}

function setupGenerator() {
  const form = qs("#generatorForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderGeneratedTexts(buildGeneratedTexts(collectForm(form)));
  });

  renderGeneratedTexts(buildGeneratedTexts({
    operation: "Продаж",
    type: "2-кімнатна квартира",
    district: "Центр Ужгорода",
    area: "63 м2",
    rooms: "2",
    price: "86 000 $",
    condition: "готова до проживання",
    benefits: "набережна поруч, індивідуальне опалення, балкон, якісний ремонт",
    contact: "066 56 56 560"
  }));
}

function renderAll() {
  renderPropertyFilters();
  renderCatalog();
  renderMap();
  renderOfficeObjects();
  renderCallFilters();
  renderCalls();
  renderOwnerSubmissions();
  renderDashboard();
}

function boot() {
  // TODO: Supabase auth
  // TODO: Supabase database
  // TODO: Supabase storage
  // TODO: import from real estate sources
  getProperties();
  applyTranslations();
  setupLanguageSwitcher();
  setupTabs();
  setupViewToggle();
  setupOpenMapLinks();
  setupPhotoPreview("#photoInput", "#photoPreview", selectedPhotos);
  setupPhotoPreview("#ownerPhotoInput", "#ownerPhotoPreview", ownerSelectedPhotos);
  setupObjectForm();
  setupCallForm();
  setupOwnerSubmissionForm();
  setupVoiceInput();
  setupFiltersAndActions();
  setupGenerator();
  renderAll();
  openMapFromHash();
}

document.addEventListener("DOMContentLoaded", boot);
