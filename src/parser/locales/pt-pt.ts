/**
 * Portuguese (Portugal) unit vocabulary. Forms are matched whole-word and
 * longest-first, so "colher de sopa" wins over a bare "colher".
 */
import { RecipeLocale } from "./locale-types";

export const PT_PT: RecipeLocale = {
	id: "pt-PT",
	label: "Portuguese (Portugal)",
	forms: {
		// colher de sopa
		"colher de sopa": "c. sopa", "colheres de sopa": "c. sopa",
		"c de sopa": "c. sopa", "c sopa": "c. sopa",
		// colher de chá
		"colher de cha": "c. chá", "colheres de cha": "c. chá",
		"c de cha": "c. chá", "c cha": "c. chá",
		// colher de café
		"colher de cafe": "c. café", "colheres de cafe": "c. café",
		"c de cafe": "c. café", "c cafe": "c. café",
		// colher de sobremesa
		"colher de sobremesa": "c. sobremesa", "colheres de sobremesa": "c. sobremesa",
		// chávena
		"chavena": "chávena", "chavenas": "chávena", "chavena de cha": "chávena",
		// countables
		"dente": "dente", "dentes": "dente", "dente de": "dente", "dentes de": "dente",
		"folha": "folha", "folhas": "folha", "folha de": "folha", "folhas de": "folha",
		"posta": "posta", "postas": "posta",
		"lata": "lata", "latas": "lata", "lata de": "lata",
		"saqueta": "saqueta", "saquetas": "saqueta",
		"ramo": "ramo", "ramos": "ramo", "ramo de": "ramo",
		"fio": "fio", "fio de": "fio",
		"unid": "unid", "unidade": "unid", "unidades": "unid",
		// metric spellings that the English table does not carry
		"gr": "g", "gramas": "g", "grama": "g",
		"litro": "l", "litros": "l",
		// quanto baste, an explicit "to taste" with no measurable amount
		"qb": "q.b.",
	},
	// "c" alone is cup in the English table. In a Portuguese recipe a lone "c."
	// is an abbreviated colher, never a cup, and guessing cup silently produces a
	// wrong amount rather than an obviously missing one.
	suppress: ["c"],
	// Size is relative and preparation happens after shopping, so neither changes
	// what goes in the basket. Deliberately absent: roxa, preta, branco, integral,
	// doce and every other variety word, which do change it.
	qualifiers: [
		"q.b.", "qb", "a gosto",
		"grande", "grandes", "médio", "média", "médios", "médias",
		"pequeno", "pequena", "pequenos", "pequenas",
		"picado", "picada", "picados", "picadas",
		"esmagado", "esmagada", "esmagados", "esmagadas",
		"ralado", "ralada", "ralados", "raladas",
		"cortado", "cortada", "cortados", "cortadas",
		"laminado", "laminada", "laminados", "laminadas",
		"fatiado", "fatiada", "fatiados", "fatiadas",
		"descascado", "descascada", "descascados", "descascadas",
		"finamente", "grosseiramente",
		"em cubos", "em pedaços", "em rodelas", "em tiras", "aos cubos",
	],
};
