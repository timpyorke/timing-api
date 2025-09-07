const fs = require('fs');
const path = require('path');

class Localization {
  constructor() {
    this.translations = {};
    this.defaultLocale = 'en';
    this.supportedLocales = ['en', 'th'];
    this.loadTranslations();
  }

  loadTranslations() {
    for (const locale of this.supportedLocales) {
      try {
        const filePath = path.join(__dirname, '..', 'locales', `${locale}.json`);
        const data = fs.readFileSync(filePath, 'utf8');
        this.translations[locale] = JSON.parse(data);
      } catch (error) {
        console.error(`Failed to load translations for locale ${locale}:`, error.message);
      }
    }
  }

  isValidLocale(locale) {
    return this.supportedLocales.includes(locale);
  }

  getLocaleFromRequest(req) {
    // Check query parameter first
    if (req.query.locale && this.isValidLocale(req.query.locale)) {
      return req.query.locale;
    }

    // Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim().toLowerCase());
      for (const lang of languages) {
        if (this.isValidLocale(lang)) {
          return lang;
        }
        // Check for language without region (e.g., 'th' from 'th-TH')
        const baseLang = lang.split('-')[0];
        if (this.isValidLocale(baseLang)) {
          return baseLang;
        }
      }
    }

    return this.defaultLocale;
  }

  translate(key, locale = this.defaultLocale, params = {}) {
    if (!this.isValidLocale(locale)) {
      locale = this.defaultLocale;
    }

    const keys = key.split('.');
    let translation = this.translations[locale];

    for (const k of keys) {
      if (translation && typeof translation === 'object' && (k in translation)) {
        translation = translation[k];
      } else {
        // Fallback to default locale if key not found
        translation = this.translations[this.defaultLocale];
        for (const fallbackKey of keys) {
          if (translation && typeof translation === 'object' && (fallbackKey in translation)) {
            translation = translation[fallbackKey];
          } else {
            return key; // Return the key if translation not found
          }
        }
        break;
      }
    }

    if (typeof translation === 'string') {
      // Replace parameters in the translation
      return translation.replace(/\{(\w+)\}/g, (match, param) => {
        return (param in params) ? params[param] : match;
      });
    }

    return translation || key;
  }

  getOrderStatusTranslation(status, locale = this.defaultLocale) {
    return this.translate(`order_status.${status}`, locale);
  }

  getErrorMessage(errorKey, locale = this.defaultLocale) {
    return this.translate(`error_messages.${errorKey}`, locale);
  }

  getSuccessMessage(successKey, locale = this.defaultLocale) {
    return this.translate(`success_messages.${successKey}`, locale);
  }

  getNotificationText(type, locale = this.defaultLocale, params = {}) {
    return {
      title: this.translate(`notifications.${type}_title`, locale, params),
      body: this.translate(`notifications.${type}_body`, locale, params)
    };
  }

  getCategoryTranslation(category, locale = this.defaultLocale) {
    return this.translate(`menu.categories.${category.toLowerCase()}`, locale) || category;
  }
}

module.exports = new Localization();
