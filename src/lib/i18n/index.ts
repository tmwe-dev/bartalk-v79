/**
 * @module i18n/index
 * Barrel export aggregating all regional translation modules
 * (Asian, European, Middle East, Other) into a single extraTranslations record.
 */

import { asianTranslations } from './languages-asian';
import { europeanTranslations } from './languages-european';
import { middleEastTranslations } from './languages-middle-east';
import { otherTranslations } from './languages-other';

export const extraTranslations: Record<string, Record<string, string>> = {
  ...asianTranslations,
  ...europeanTranslations,
  ...middleEastTranslations,
  ...otherTranslations,
};
