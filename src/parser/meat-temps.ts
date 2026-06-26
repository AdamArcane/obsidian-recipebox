/**
 * Static data tables: safe internal cooking temperatures per meat category and
 * qualifier words that indicate a meat keyword should be ignored (e.g. "imitation").
 */
export interface TempCategory {
	name: string;
	fahrenheit: number;
	celsius: number;
	keywords: string[];
}

export const MEAT_CATEGORIES: TempCategory[] = [
	{
		name: "Poultry",
		fahrenheit: 165,
		celsius: 74,
		keywords: [
			"chicken", "turkey", "duck", "goose", "hen", "quail", "pheasant",
			"cornish hen", "poultry", "fowl", "capon",
		],
	},
	{
		name: "Ground meat",
		fahrenheit: 160,
		celsius: 71,
		keywords: [
			"ground beef", "ground pork", "ground turkey", "ground chicken",
			"ground lamb", "ground veal", "ground meat", "hamburger", "mince",
			"minced beef", "minced pork", "minced lamb",
		],
	},
	{
		name: "Pork",
		fahrenheit: 145,
		celsius: 63,
		keywords: [
			"pork", "ham", "bacon", "prosciutto", "pancetta", "salami",
			"sausage", "chorizo", "pepperoni", "ribs", "pork chop",
			"pork loin", "pork shoulder", "pork belly", "pulled pork",
			"spare rib", "tenderloin",
		],
	},
	{
		name: "Beef/lamb/veal",
		fahrenheit: 145,
		celsius: 63,
		keywords: [
			"beef", "steak", "brisket", "chuck", "sirloin", "ribeye",
			"flank steak", "skirt steak", "t-bone", "new york strip",
			"lamb", "mutton", "rack of lamb", "leg of lamb",
			"veal", "venison", "bison", "elk",
		],
	},
	{
		name: "Fish",
		fahrenheit: 145,
		celsius: 63,
		keywords: [
			"fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout",
			"bass", "catfish", "mahi", "swordfish", "snapper", "flounder",
			"haddock", "pollock", "sardine", "anchovy", "mackerel", "herring",
		],
	},
	{
		name: "Shellfish",
		fahrenheit: 145,
		celsius: 63,
		keywords: [
			"shrimp", "prawn", "crab", "lobster", "scallop", "clam",
			"mussel", "oyster", "squid", "octopus", "crayfish", "crawfish",
			"langoustine", "shellfish", "seafood",
		],
	},
];

export const NON_MEAT_QUALIFIERS = [
	"stock", "broth", "bouillon", "consomme", "consommé", "stuffing",
	"sauce", "powder", "extract", "flavor", "flavour", "cream of",
	"flavoring", "flavouring", "seasoning", "rub", "jerky",
];
