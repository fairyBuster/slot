window.GAMES = [
{
"id": "1016",
"name": "Book of the Ancients"
},
{
"id": "1035",
"name": "Power Zeus"
},
{
"id": "1044",
"name": "Honey Bear"
},
{
"id": "1046",
"name": "Mole's Treasure"
},
{
"id": "1047",
"name": "Queen of Dragons"
},
{
"id": "1048",
"name": "Mermaid Magic"
},
{
"id": "1053",
"name": "Tycoon Delight"
},
{
"id": "1063",
"name": "Wealthy Atlantis"
},
{
"id": "1064",
"name": ""
},
{
"id": "1065",
"name": ""
},
{
"id": "1066",
"name": ""
},
{
"id": "1069",
"name": ""
},
{
"id": "1070",
"name": ""
},
{
"id": "1072",
"name": ""
},
{
"id": "1074",
"name": "Toro Drums"
},
{
"id": "1078",
"name": "Gems of Fortune"
},
{
"id": "1081",
"name": ""
},
{
"id": "1082",
"name": ""
},
{
"id": "1083",
"name": "Western Legends"
},
{
"id": "1085",
"name": "Magic Apples"
},
{
"id": "1087",
"name": ""
},
{
"id": "1088",
"name": ""
},
{
"id": "1091",
"name": "Ocean Riches"
},
{
"id": "1102",
"name": ""
},
{
"id": "1104",
"name": ""
},
{
"id": "1107",
"name": "Wizard Legend"
},
{
"id": "1109",
"name": ""
},
{
"id": "1110",
"name": ""
},
{
"id": "1112",
"name": ""
},
{
"id": "1113",
"name": ""
},
{
"id": "1114",
"name": "Dragon Trainer"
},
{
"id": "1115",
"name": ""
},
{
"id": "1118",
"name": ""
},
{
"id": "1123",
"name": ""
},
{
"id": "1125",
"name": ""
},
{
"id": "1127",
"name": ""
},
{
"id": "1132",
"name": ""
},
{
"id": "1134",
"name": ""
},
{
"id": "1136",
"name": ""
},
{
"id": "1137",
"name": ""
},
{
"id": "1141",
"name": ""
},
{
"id": "1142",
"name": ""
},
{
"id": "1147",
"name": ""
},
{
"id": "1150",
"name": ""
},
{
"id": "1151",
"name": ""
},
{
"id": "1153",
"name": ""
},
{
"id": "1155",
"name": ""
},
{
"id": "1158",
"name": "Rhino Rush"
},
{
"id": "1159",
"name": ""
},
{
"id": "1160",
"name": "Egyptian Madness"
},
{
"id": "1167",
"name": ""
},
{
"id": "1168",
"name": "Medusa's Wrath"
},
{
"id": "1169",
"name": ""
},
{
"id": "1172",
"name": ""
},
{
"id": "1174",
"name": ""
},
{
"id": "1175",
"name": "Titan Descends"
},
{
"id": "1178",
"name": "Wins of Fortune"
},
{
"id": "1181",
"name": ""
},
{
"id": "1182",
"name": ""
},
{
"id": "1184",
"name": "Roar of Legends"
},
{
"id": "1185",
"name": ""
},
{
"id": "1186",
"name": "Siren's Abyssal Hoard"
},
{
"id": "1187",
"name": ""
},
{
"id": "1189",
"name": ""
},
{
"id": "1191",
"name": ""
},
{
"id": "1193",
"name": ""
},
{
"id": "1194",
"name": ""
},
{
"id": "1197",
"name": ""
},
{
"id": "1198",
"name": ""
},
{
"id": "1200",
"name": ""
},
{
"id": "1202",
"name": ""
},
{
"id": "1203",
"name": ""
},
{
"id": "1205",
"name": ""
},
{
"id": "1209",
"name": ""
},
{
"id": "1218",
"name": ""
},
{
"id": "5001",
"name": ""
},
{
"id": "5002",
"name": ""
},
{
"id": "5003",
"name": ""
},
{
"id": "5004",
"name": ""
},
{
"id": "5006",
"name": ""
},
{
"id": "5007",
"name": ""
},
{
"id": "5009",
"name": ""
},
{
"id": "5010",
"name": ""
},
{
"id": "5011",
"name": ""
},
{
"id": "5012",
"name": ""
}
];
window.MACHINES = window.GAMES.map(function (g) { return g.id; });
window.GAME_NAMES = window.GAMES.reduce(function (a, g) { if (g.name) a[g.id] = g.name; return a; }, {});
