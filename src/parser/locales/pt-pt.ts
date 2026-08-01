/**
 * Portuguese (Portugal) unit vocabulary. Forms are matched whole-word and
 * longest-first, so "colher de sopa" wins over a bare "colher". Plural forms map
 * onto the same canonical unit and never stand in for an amount: "2 dúzias" is a
 * quantity of two, not of twenty-four.
 */
import { RecipeLocale } from "./locale-types";
import { inflect } from "./inflect";

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
		// Countables. No "<unit> de" entries: stripOf removes the preposition right
		// after the unit is consumed, so "dentes de alho" already yields alho and the
		// longer form would only be a second spelling of the same match.
		//
		// "chavena de cha" above is not an instance of that and must stay. Its trailing
		// word is a second unit-word rather than a preposition, so stripOf cannot reach
		// it: with only "chavena", "1 chávena de chá de farinha" consumes the chávena,
		// drops the first "de" and leaves an ingredient called "chá de farinha".
		"dente": "dente", "dentes": "dente",
		"folha": "folha", "folhas": "folha",
		"posta": "posta", "postas": "posta",
		"lata": "lata", "latas": "lata",
		"saqueta": "saqueta", "saquetas": "saqueta",
		"ramo": "ramo", "ramos": "ramo",
		"fio": "fio", "fios": "fio",
		"unid": "unid", "unidade": "unid", "unidades": "unid",
		"pitada": "pitada", "pitadas": "pitada",
		"copo": "copo", "copos": "copo",
		"fatia": "fatia", "fatias": "fatia",
		"pau": "pau", "paus": "pau",
		"talo": "talo", "talos": "talo",
		// Mirrors the English "head": "cabeça de peixe" is a fish head rather than a
		// measure of fish, which is the same ambiguity English already accepts here.
		"cabeça": "cabeça", "cabeças": "cabeça",
		// packaging, each mirroring an entry the English table already carries
		"pacote": "pacote", "pacotes": "pacote",
		"embalagem": "embalagem", "embalagens": "embalagem",
		"frasco": "frasco", "frascos": "frasco",
		"garrafa": "garrafa", "garrafas": "garrafa",
		"caixa": "caixa", "caixas": "caixa",
		// A multiplier-noun is a unit, never a numeral: putting "dúzia" in numerals
		// made "1 dúzia de ovos" parse as a bare 1 while "meia dúzia" became 0.5 of
		// nothing. As a unit it behaves exactly like the English "dozen".
		"duzia": "dúzia", "duzias": "dúzia",
		// metric spellings that the English table does not carry
		"gr": "g", "gramas": "g", "grama": "g",
		"litro": "l", "litros": "l",
		// Deliberately absent: "molho". It is a bunch in "molho de coentros" and a
		// sauce in "molho de tomate", so reading it as a unit would turn a sauce into
		// a count of tomatoes. That is the c./cup failure in another language, and the
		// rule stands: a form that means two different things stays out of the table.
	},
	// "c" alone is cup in the English table. In a Portuguese recipe a lone "c."
	// is an abbreviated colher, never a cup, and guessing cup silently produces a
	// wrong amount rather than an obviously missing one.
	suppress: ["c"],
	// Size is relative and preparation happens after shopping, so neither changes
	// what goes in the basket. Deliberately absent: roxa, preta, branco, integral,
	// doce and every other variety word, which do change it.
	//
	// The sharpest case is grosso/fino, which look like size words and are not:
	// sal grosso and sal fino are two products on two different shelves. Nothing
	// here may be added on the strength of its grammatical class alone.
	//
	// "q.b." appears here and must not also appear in forms. A form that is both a
	// unit and a qualifier parses differently depending on where it sits in the
	// line, which split "sal q.b." and "q.b. de sal" into two grocery entries for
	// one bag of salt. locale-contract.test.ts holds the two lists disjoint.
	qualifiers: [
		"q.b.", "a gosto",
		// size
		...inflect("grand", "e", "es"),
		...inflect("médi", "o", "a", "os", "as"),
		...inflect("pequen", "o", "a", "os", "as"),
		// preparation
		...inflect("picad", "o", "a", "os", "as"),
		...inflect("esmagad", "o", "a", "os", "as"),
		...inflect("ralad", "o", "a", "os", "as"),
		...inflect("cortad", "o", "a", "os", "as"),
		...inflect("laminad", "o", "a", "os", "as"),
		...inflect("fatiad", "o", "a", "os", "as"),
		...inflect("descascad", "o", "a", "os", "as"),
		...inflect("derretid", "o", "a", "os", "as"),
		...inflect("escorrid", "o", "a", "os", "as"),
		...inflect("triturad", "o", "a", "os", "as"),
		"finamente", "grosseiramente",
		"em cubos", "em pedaços", "em rodelas", "em tiras", "em fatias",
		"em quartos", "aos cubos", "ao meio",
	],
	// Cardinals and fractions only. A word that multiplies a countable noun, such
	// as dúzia, is a unit and lives in forms: numerals are consumed before units,
	// so a multiplier-noun placed here shadows the digit in front of it.
	numerals: {
		"um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "quatro": 4, "cinco": 5,
		"seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
		"meio": 0.5, "meia": 0.5, "um quarto": 0.25, "uma quarta": 0.25,
	},
	prepositions: ["de", "do", "da", "dos", "das"],
};
