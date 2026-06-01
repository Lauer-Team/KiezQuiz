const BERLIN_DATA = [
  {
    "name": "Rahnsdorf",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "21,50",
    "population": "11.138"
  },
  {
    "name": "Rudow",
    "bezirk": "Neukölln",
    "area_km2": "11,80",
    "population": "42.818"
  },
  {
    "name": "Malchow",
    "bezirk": "Lichtenberg",
    "area_km2": "1,54",
    "population": "612"
  },
  {
    "name": "Charlottenburg-Nord",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "6,20",
    "population": "19.665"
  },
  {
    "name": "Siemensstadt",
    "bezirk": "Spandau",
    "area_km2": "5,66",
    "population": "13.438"
  },
  {
    "name": "Hakenfelde",
    "bezirk": "Spandau",
    "area_km2": "20,40",
    "population": "34.927"
  },
  {
    "name": "Borsigwalde",
    "bezirk": "Reinickendorf",
    "area_km2": "2,00",
    "population": "7.101"
  },
  {
    "name": "Stadtrandsiedlung Malchow",
    "bezirk": "Pankow",
    "area_km2": "5,68",
    "population": "1.088"
  },
  {
    "name": "Neukölln",
    "bezirk": "Neukölln",
    "area_km2": "11,70",
    "population": "162.548"
  },
  {
    "name": "Oberschöneweide",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "6,18",
    "population": "25.664"
  },
  {
    "name": "Dahlem",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "8,39",
    "population": "16.726"
  },
  {
    "name": "Hermsdorf",
    "bezirk": "Reinickendorf",
    "area_km2": "6,10",
    "population": "16.607"
  },
  {
    "name": "Wannsee",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "23,70",
    "population": "10.188"
  },
  {
    "name": "Friedrichshain",
    "bezirk": "Friedrichshain-Kreuzberg",
    "area_km2": "9,78",
    "population": "141.206"
  },
  {
    "name": "Bohnsdorf",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "6,52",
    "population": "13.780"
  },
  {
    "name": "Karow",
    "bezirk": "Pankow",
    "area_km2": "6,65",
    "population": "20.185"
  },
  {
    "name": "Gropiusstadt",
    "bezirk": "Neukölln",
    "area_km2": "2,66",
    "population": "39.011"
  },
  {
    "name": "Wedding",
    "bezirk": "Mitte",
    "area_km2": "9,23",
    "population": "86.796"
  },
  {
    "name": "Frohnau",
    "bezirk": "Reinickendorf",
    "area_km2": "7,80",
    "population": "16.371"
  },
  {
    "name": "Wilmersdorf",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "7,16",
    "population": "101.220"
  },
  {
    "name": "Marzahn",
    "bezirk": "Marzahn-Hellersdorf",
    "area_km2": "19,50",
    "population": "119.584"
  },
  {
    "name": "Buch",
    "bezirk": "Pankow",
    "area_km2": "18,20",
    "population": "17.451"
  },
  {
    "name": "Lübars",
    "bezirk": "Reinickendorf",
    "area_km2": "5,00",
    "population": "5.104"
  },
  {
    "name": "Gatow",
    "bezirk": "Spandau",
    "area_km2": "10,10",
    "population": "3.530"
  },
  {
    "name": "Biesdorf",
    "bezirk": "Marzahn-Hellersdorf",
    "area_km2": "12,40",
    "population": "30.959"
  },
  {
    "name": "Niederschöneweide",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "3,49",
    "population": "14.508"
  },
  {
    "name": "Weißensee",
    "bezirk": "Pankow",
    "area_km2": "7,93",
    "population": "57.552"
  },
  {
    "name": "Gesundbrunnen",
    "bezirk": "Mitte",
    "area_km2": "6,13",
    "population": "95.132"
  },
  {
    "name": "Schmargendorf",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "3,59",
    "population": "24.132"
  },
  {
    "name": "Wittenau",
    "bezirk": "Reinickendorf",
    "area_km2": "5,90",
    "population": "25.239"
  },
  {
    "name": "Pankow",
    "bezirk": "Pankow",
    "area_km2": "5,66",
    "population": "68.684"
  },
  {
    "name": "Müggelheim",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "22,20",
    "population": "7.059"
  },
  {
    "name": "Falkenberg",
    "bezirk": "Lichtenberg",
    "area_km2": "3,06",
    "population": "3.095"
  },
  {
    "name": "Konradshöhe",
    "bezirk": "Reinickendorf",
    "area_km2": "2,20",
    "population": "6.113"
  },
  {
    "name": "Britz",
    "bezirk": "Neukölln",
    "area_km2": "12,40",
    "population": "44.012"
  },
  {
    "name": "Heinersdorf",
    "bezirk": "Pankow",
    "area_km2": "3,95",
    "population": "9.557"
  },
  {
    "name": "Lichtenrade",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "10,10",
    "population": "52.790"
  },
  {
    "name": "Märkisches Viertel",
    "bezirk": "Reinickendorf",
    "area_km2": "3,20",
    "population": "41.254"
  },
  {
    "name": "Tempelhof",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "12,20",
    "population": "63.580"
  },
  {
    "name": "Westend",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "13,50",
    "population": "41.046"
  },
  {
    "name": "Tegel",
    "bezirk": "Reinickendorf",
    "area_km2": "33,70",
    "population": "41.277"
  },
  {
    "name": "Neu-Hohenschönhausen",
    "bezirk": "Lichtenberg",
    "area_km2": "5,16",
    "population": "59.200"
  },
  {
    "name": "Mahlsdorf",
    "bezirk": "Marzahn-Hellersdorf",
    "area_km2": "12,90",
    "population": "30.353"
  },
  {
    "name": "Adlershof",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "6,11",
    "population": "22.417"
  },
  {
    "name": "Altglienicke",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "7,89",
    "population": "33.159"
  },
  {
    "name": "Französisch Buchholz",
    "bezirk": "Pankow",
    "area_km2": "12,00",
    "population": "21.823"
  },
  {
    "name": "Kreuzberg",
    "bezirk": "Friedrichshain-Kreuzberg",
    "area_km2": "10,40",
    "population": "151.418"
  },
  {
    "name": "Grünau",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "9,13",
    "population": "8.376"
  },
  {
    "name": "Friedenau",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "1,65",
    "population": "29.406"
  },
  {
    "name": "Schmöckwitz",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "17,10",
    "population": "4.487"
  },
  {
    "name": "Wilhelmstadt",
    "bezirk": "Spandau",
    "area_km2": "10,40",
    "population": "41.250"
  },
  {
    "name": "Grunewald",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "22,30",
    "population": "11.154"
  },
  {
    "name": "Plänterwald",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "3,01",
    "population": "11.753"
  },
  {
    "name": "Marienfelde",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "9,15",
    "population": "32.365"
  },
  {
    "name": "Karlshorst",
    "bezirk": "Lichtenberg",
    "area_km2": "6,60",
    "population": "31.890"
  },
  {
    "name": "Reinickendorf",
    "bezirk": "Reinickendorf",
    "area_km2": "10,50",
    "population": "85.618"
  },
  {
    "name": "Zehlendorf",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "< 18,80",
    "population": "54.745"
  },
  {
    "name": "Waidmannslust",
    "bezirk": "Reinickendorf",
    "area_km2": "2,30",
    "population": "11.408"
  },
  {
    "name": "Friedrichshagen",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "14,00",
    "population": "19.036"
  },
  {
    "name": "Schöneberg",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "10,60",
    "population": "125.060"
  },
  {
    "name": "Hellersdorf",
    "bezirk": "Marzahn-Hellersdorf",
    "area_km2": "8,10",
    "population": "93.512"
  },
  {
    "name": "Alt-Hohenschönhausen",
    "bezirk": "Lichtenberg",
    "area_km2": "9,33",
    "population": "53.086"
  },
  {
    "name": "Mariendorf",
    "bezirk": "Tempelhof-Schöneberg",
    "area_km2": "9,38",
    "population": "53.758"
  },
  {
    "name": "Friedrichsfelde",
    "bezirk": "Lichtenberg",
    "area_km2": "5,55",
    "population": "58.098"
  },
  {
    "name": "Tiergarten",
    "bezirk": "Mitte",
    "area_km2": "5,17",
    "population": "16.162"
  },
  {
    "name": "Wartenberg",
    "bezirk": "Lichtenberg",
    "area_km2": "6,92",
    "population": "2.669"
  },
  {
    "name": "Köpenick",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "34,90",
    "population": "71.366"
  },
  {
    "name": "Baumschulenweg",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "4,82",
    "population": "19.404"
  },
  {
    "name": "Staaken",
    "bezirk": "Spandau",
    "area_km2": "10,90",
    "population": "47.315"
  },
  {
    "name": "Kaulsdorf",
    "bezirk": "Marzahn-Hellersdorf",
    "area_km2": "8,81",
    "population": "19.683"
  },
  {
    "name": "Rummelsburg",
    "bezirk": "Lichtenberg",
    "area_km2": "4,52",
    "population": "27.577"
  },
  {
    "name": "Steglitz",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "6,79",
    "population": "76.247"
  },
  {
    "name": "Prenzlauer Berg",
    "bezirk": "Pankow",
    "area_km2": "11,00",
    "population": "169.882"
  },
  {
    "name": "Hansaviertel",
    "bezirk": "Mitte",
    "area_km2": "0,53",
    "population": "6.170"
  },
  {
    "name": "Moabit",
    "bezirk": "Mitte",
    "area_km2": "7,72",
    "population": "84.490"
  },
  {
    "name": "Alt-Treptow",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "2,31",
    "population": "13.453"
  },
  {
    "name": "Rosenthal",
    "bezirk": "Pankow",
    "area_km2": "4,90",
    "population": "10.107"
  },
  {
    "name": "Lichtenberg",
    "bezirk": "Lichtenberg",
    "area_km2": "7,22",
    "population": "44.837"
  },
  {
    "name": "Haselhorst",
    "bezirk": "Spandau",
    "area_km2": "4,73",
    "population": "19.994"
  },
  {
    "name": "Spandau",
    "bezirk": "Spandau",
    "area_km2": "8,03",
    "population": "42.353"
  },
  {
    "name": "Lankwitz",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "6,99",
    "population": "44.698"
  },
  {
    "name": "Heiligensee",
    "bezirk": "Reinickendorf",
    "area_km2": "10,70",
    "population": "18.006"
  },
  {
    "name": "Schlachtensee",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "4,05",
    "population": "10.354"
  },
  {
    "name": "Fennpfuhl",
    "bezirk": "Lichtenberg",
    "area_km2": "2,12",
    "population": "34.484"
  },
  {
    "name": "Halensee",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "1,27",
    "population": "15.719"
  },
  {
    "name": "Blankenburg",
    "bezirk": "Pankow",
    "area_km2": "6,03",
    "population": "6.921"
  },
  {
    "name": "Kladow",
    "bezirk": "Spandau",
    "area_km2": "14,80",
    "population": "16.548"
  },
  {
    "name": "Mitte",
    "bezirk": "Mitte",
    "area_km2": "10,70",
    "population": "108.254"
  },
  {
    "name": "Niederschönhausen",
    "bezirk": "Pankow",
    "area_km2": "6,49",
    "population": "33.324"
  },
  {
    "name": "Wilhelmsruh",
    "bezirk": "Pankow",
    "area_km2": "1,37",
    "population": "8.279"
  },
  {
    "name": "Buckow",
    "bezirk": "Neukölln",
    "area_km2": "6,35",
    "population": "41.099"
  },
  {
    "name": "Charlottenburg",
    "bezirk": "Charlottenburg-Wilmersdorf",
    "area_km2": "10,60",
    "population": "130.564"
  },
  {
    "name": "Johannisthal",
    "bezirk": "Treptow-Köpenick",
    "area_km2": "6,54",
    "population": "21.636"
  },
  {
    "name": "Falkenhagener Feld",
    "bezirk": "Spandau",
    "area_km2": "6,88",
    "population": "39.922"
  },
  {
    "name": "Lichterfelde",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "18,20",
    "population": "85.445"
  },
  {
    "name": "Nikolassee",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "< 19,60",
    "population": "11.641"
  },
  {
    "name": "Blankenfelde",
    "bezirk": "Pankow",
    "area_km2": "13,40",
    "population": "2.423"
  },
  {
    "name": "Pfaueninsel",
    "bezirk": "Steglitz-Zehlendorf",
    "area_km2": "0,67",
    "population": "0",
    "is_island": true
  }
];
window.BERLIN_DATA = BERLIN_DATA;
