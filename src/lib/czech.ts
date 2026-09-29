import type { Option } from 'payload'

/**
 * Czech real-estate vocabulary.
 *
 * Kept in one place because these lists are the contract between the CMS, the
 * generated site's filter UI, and (eventually) any portal export. Changing a
 * `value` is a data migration; changing a `label` is not — so values are ASCII
 * slugs and never the Czech display text.
 */

const opt = (value: string, cs: string): Option => ({ value, label: { cs } })

/** Prodej / pronájem / dražba. */
export const TRANSACTION_TYPES: Option[] = [
  opt('prodej', 'Prodej'),
  opt('pronajem', 'Pronájem'),
  opt('drazba', 'Dražba'),
]

/** Druh nemovitosti. */
export const PROPERTY_TYPES: Option[] = [
  opt('byt', 'Byt'),
  opt('dum', 'Dům'),
  opt('pozemek', 'Pozemek'),
  opt('komercni', 'Komerční objekt'),
  opt('garaz', 'Garáž'),
  opt('chata', 'Chata / rekreační objekt'),
  opt('ostatni', 'Ostatní'),
]

/** Dispozice — applies to byt and dům. */
export const DISPOSITIONS: Option[] = [
  opt('garsoniera', 'Garsoniéra'),
  opt('1-kk', '1+kk'),
  opt('1-1', '1+1'),
  opt('2-kk', '2+kk'),
  opt('2-1', '2+1'),
  opt('3-kk', '3+kk'),
  opt('3-1', '3+1'),
  opt('4-kk', '4+kk'),
  opt('4-1', '4+1'),
  opt('5-kk', '5+kk'),
  opt('5-1', '5+1'),
  opt('6-a-vice', '6 a více'),
  opt('atypicky', 'Atypický'),
]

/** Vlastnictví. Družstevní is common in CZ and materially changes financing. */
export const OWNERSHIP_TYPES: Option[] = [
  opt('osobni', 'Osobní'),
  opt('druzstevni', 'Družstevní'),
  opt('statni', 'Státní / obecní'),
]

/** Konstrukce budovy. */
export const BUILDING_TYPES: Option[] = [
  opt('cihla', 'Cihlová'),
  opt('panel', 'Panelová'),
  opt('skeletova', 'Skeletová'),
  opt('drevostavba', 'Dřevostavba'),
  opt('montovana', 'Montovaná'),
  opt('smisena', 'Smíšená'),
  opt('ostatni', 'Ostatní'),
]

/** Stav objektu. */
export const BUILDING_CONDITIONS: Option[] = [
  opt('novostavba', 'Novostavba'),
  opt('velmi-dobry', 'Velmi dobrý'),
  opt('dobry', 'Dobrý'),
  opt('po-rekonstrukci', 'Po rekonstrukci'),
  opt('pred-rekonstrukci', 'Před rekonstrukcí'),
  opt('spatny', 'Špatný'),
  opt('k-demolici', 'K demolici'),
  opt('ve-vystavbe', 'Ve výstavbě'),
  opt('projekt', 'Projekt'),
]

/**
 * PENB — energetická třída.
 *
 * Stating the class when advertising a property is required by
 * zákon č. 406/2000 Sb. `EXEMPT` and `PENDING` exist because the obligation has
 * lawful exceptions and because certificates take time to issue — without them
 * realtors would simply pick a wrong letter to get past a required field.
 */
export const ENERGY_CLASSES: Option[] = [
  opt('A', 'A — Mimořádně úsporná'),
  opt('B', 'B — Velmi úsporná'),
  opt('C', 'C — Úsporná'),
  opt('D', 'D — Méně úsporná'),
  opt('E', 'E — Nehospodárná'),
  opt('F', 'F — Velmi nehospodárná'),
  opt('G', 'G — Mimořádně nehospodárná'),
  opt('EXEMPT', 'Zákonná výjimka — průkaz se nevyžaduje'),
  opt('PENDING', 'Průkaz se zpracovává'),
]

/** Vytápění. */
export const HEATING_TYPES: Option[] = [
  opt('ustredni-dalkove', 'Ústřední dálkové'),
  opt('ustredni-plynove', 'Ústřední plynové'),
  opt('ustredni-elektricke', 'Ústřední elektrické'),
  opt('lokalni-plynove', 'Lokální plynové'),
  opt('tepelne-cerpadlo', 'Tepelné čerpadlo'),
  opt('kotel-tuha-paliva', 'Kotel na tuhá paliva'),
  opt('jine', 'Jiné'),
]

/** Vybavení a vlastnosti. */
export const PROPERTY_FEATURES: Option[] = [
  opt('balkon', 'Balkon'),
  opt('lodzie', 'Lodžie'),
  opt('terasa', 'Terasa'),
  opt('sklep', 'Sklep'),
  opt('garaz', 'Garáž'),
  opt('parkovani', 'Parkovací stání'),
  opt('vytah', 'Výtah'),
  opt('zahrada', 'Zahrada'),
  opt('bazen', 'Bazén'),
  opt('krb', 'Krb'),
  opt('klimatizace', 'Klimatizace'),
  opt('bezbarierovy', 'Bezbariérový přístup'),
  opt('vybaveno', 'Vybaveno'),
  opt('castecne-vybaveno', 'Částečně vybaveno'),
  opt('nevybaveno', 'Nevybaveno'),
  opt('internet', 'Internet'),
  opt('mhd-v-dosahu', 'MHD v dosahu'),
]

/** Stav inzerátu. */
export const LISTING_STATUSES: Option[] = [
  opt('draft', 'Rozpracovaný'),
  opt('active', 'Aktivní'),
  opt('reserved', 'Rezervováno'),
  opt('sold', 'Prodáno'),
  opt('rented', 'Pronajato'),
]

/** Kraje — the 14 Czech regions, values as ASCII slugs. */
export const CZ_REGIONS: Option[] = [
  opt('praha', 'Hlavní město Praha'),
  opt('stredocesky', 'Středočeský kraj'),
  opt('jihocesky', 'Jihočeský kraj'),
  opt('plzensky', 'Plzeňský kraj'),
  opt('karlovarsky', 'Karlovarský kraj'),
  opt('ustecky', 'Ústecký kraj'),
  opt('liberecky', 'Liberecký kraj'),
  opt('kralovehradecky', 'Královéhradecký kraj'),
  opt('pardubicky', 'Pardubický kraj'),
  opt('vysocina', 'Kraj Vysočina'),
  opt('jihomoravsky', 'Jihomoravský kraj'),
  opt('olomoucky', 'Olomoucký kraj'),
  opt('zlinsky', 'Zlínský kraj'),
  opt('moravskoslezsky', 'Moravskoslezský kraj'),
]

/**
 * Czech text to a URL-safe slug.
 *
 * `normalize('NFD')` splits a letter from its diacritic so the combining marks
 * can be stripped — that is what turns "Byt v Plzni u Přehrady" into
 * "byt-v-plzni-u-prehrady" rather than dropping the accented letters entirely.
 * `ů` and `ř` are the ones that break naive implementations.
 */
export function slugifyCzech(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}
