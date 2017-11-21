import {SelectItem} from "primeng/primeng";
import {GameSystemConfig} from "../game-systems";
import {Participant} from "../Participant";
import * as _ from 'lodash';
import {Team} from "../Team";

export function getWmHoFieldConfig(): GameSystemConfig {

  const gameConfig: GameSystemConfig = {playerFields: [],
    participantFields: [], scoreFields: [], standingFields: [], choosePlayed: []};

  gameConfig.playerFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getWmHoFactionsAsSelectItems()
  }, {
    defaultValue: [],
    type: 'multiSelect',
    field: 'ArmyLists',
    fieldValues: getWmHoCasterAsSelectItem()
  });
  gameConfig.participantFields.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'Faction',
    fieldValues: getWmHoFactionsAsSelectItems()
  }, {
    defaultValue: [],
    type: 'multiSelect',
    field: 'ArmyLists',
    fieldValues: getWmHoCasterAsSelectItem()
  });

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'sos',
    isTeam: false,
  });

  gameConfig.standingFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'cp',
    isTeam: true,
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'vp',
    isTeam: true,
  });

  gameConfig.scoreFields.push({
    defaultValue: 0,
    type: 'number',
    field: 'cp',
    fieldPlayerOne: 'cpParticipantOne',
    fieldPlayerTwo: 'cpParticipantTwo',
    min: 0,
    max: 30
  }, {
    defaultValue: 0,
    type: 'number',
    field: 'vp',
    fieldPlayerOne: 'vpParticipantOne',
    fieldPlayerTwo: 'vpParticipantTwo',
    min: 0,
    max: 200
  });

  gameConfig.choosePlayed.push({
    defaultValue: '',
    type: 'dropDown',
    field: 'ArmyLists',
    fieldPlayerOne: 'armyListParticipantOne',
    fieldPlayerTwo: 'armyListParticipantTwo',
  });

  return gameConfig;
}

export function orderParticipantsForWmHo( participants: Participant[], participantsScoreMap: any): Participant[] {
  return participants.sort((part1, part2) => {

    if ( participantsScoreMap[part1.name] < participantsScoreMap[part2.name]) {
      return 1;
    } else if ( participantsScoreMap[part1.name] > participantsScoreMap[part2.name]) {
      return -1;
    }

    if (getSos(part1, participantsScoreMap) < getSos(part2, participantsScoreMap)) {
      return 1;
    } else if (getSos(part1, participantsScoreMap) > getSos(part2, participantsScoreMap)) {
      return -1;
    }

    if (getCP(part1) < getCP(part2)) {
      return 1;
    } else if (getCP(part1) > getCP(part2)) {
      return -1;
    }
    if (getVP(part1) < getVP(part2)) {
      return 1;
    } else if (getVP(part1) > getVP(part2)) {
      return -1;
    }

    return 0;
  });
}

export function orderTeamsForWmHo( teams: Team[], teamsScoreMap: any): Team[] {
  return teams.sort((team1, team2) => {

    let result = 0;

    if (teamsScoreMap[team1.name] < teamsScoreMap[team2.name]) {
      result = 1;
    } else if (teamsScoreMap[team1.name] > teamsScoreMap[team2.name]) {
      result = -1;
    } else {
      if (getSgw(team1) < getSgw(team2)) {
        result = 1;
      } else if (getSgw(team1) > getSgw(team2)) {
        result = -1;
      } else {
        if (getCP(team1) < getCP(team2)) {
          result = 1;
        } else if (getCP(team1) > getCP(team2)) {
          result = -1;
        } else {
          if (getVP(team1) < getVP(team2)) {
            result = 1;
          } else if (getVP(team1) > getVP(team2)) {
            result = -1;
          }
        }
      }
    }
    return result;
  });
}


export function getSos(participant: Participant, participantsScoreMap: any) {

  let sosSum = 0;
  _.forEach(participant.opponentParticipantsNames, function (opponentName: string) {
    if (opponentName !== 'bye') {
      sosSum = sosSum + participantsScoreMap[opponentName];
    }
  });
  return sosSum;
}

export function getCP(participant: any) {

  let cpSum = 0;
  _.forEach(participant.cp, function (cp: number) {
    cpSum = cpSum + cp;
  });
  return cpSum;
}

export function getVP(participant: any) {

  let vpSum = 0;
  _.forEach(participant.vp, function (vp: number) {
    vpSum = vpSum + vp;
  });
  return vpSum;
}

export function getSgw(team: Team) {

  let sgwSum = 0;
  _.forEach(team.sgw, function (sgw: number) {
    sgwSum = sgwSum + sgw;
  });
  return sgwSum;
}


export function getWmHoFactions(): string[] {
  return ['Cygnar', 'Khador', 'Menoth', 'Cryx', 'Retribution', 'Convergence', 'Mercenaries', 'Trollbloods', 'Circle',
    'Skorne', 'Legion', 'Minions', 'Grymkin'];
}

export function getWmHoFactionsAsSelectItems(): SelectItem[] {
  return [{value: 'Cygnar', label: 'Cygnar'},
    {value: 'Khador', label: 'Khador'},
    {value: 'Menoth', label: 'Menoth'},
    {value: 'Cryx', label: 'Cryx'},
    {value: 'Retribution', label: 'Retribution'},
    {value: 'Convergence', label: 'Convergence'},
    {value: 'Mercenaries', label: 'Mercenaries'},
    {value: 'Trollbloods', label: 'Trollbloods'},
    {value: 'Circle', label: 'Circle'},
    {value: 'Skorne', label: 'Skorne'},
    {value: 'Legion', label: 'Legion'},
    {value: 'Minions', label: 'Minions'},
    {value: 'Grymkin', label: 'Grymkin'}];
}


export function getAllScenarios(): string[] {
  return [
    '1. The Pit II ', '2. Standoff', '3. Spread the Net', '4. Breakdown ', '5. Outlast ', '6. Recon II',
    'Rumble 1 Patrol', 'Rumble 2 Killing Field', 'Rumble 3 Target of Opportunity'];
}

export function getWmHoCasterAsSelectItem(): SelectItem[] {

  return [{value: 'Blaize1', label: 'Blaize1'},
    {value: 'Brisbane1', label: 'Brisbane1'},
    {value: 'Brisbane2', label: 'Brisbane2'},
    {value: 'Caine1', label: 'Caine1'},
    {value: 'Caine2', label: 'Caine2'},
    {value: 'Caine3', label: 'Caine3'},
    {value: 'Darius1', label: 'Darius1'},
    {value: 'Haley1', label: 'Haley1'},
    {value: 'Haley2', label: 'Haley2'},
    {value: 'Haley3', label: 'Haley3'},
    {value: 'Kraye1', label: 'Kraye1'},
    {value: 'Maddox1', label: 'Maddox1'},
    {value: 'Nemo1', label: 'Nemo1'},
    {value: 'Nemo2', label: 'Nemo2'},
    {value: 'Nemo3', label: 'Nemo3'},
    {value: 'Sloan1', label: 'Sloan1'},
    {value: 'Stryker1', label: 'Stryker1'},
    {value: 'Stryker2', label: 'Stryker2'},
    {value: 'Stryker3', label: 'Stryker3'},
    {value: 'Sturgis1', label: 'Sturgis1'},
    {value: 'Aurora1', label: 'Aurora1'},
    {value: 'Axis1', label: 'Axis1'},
    {value: 'Father1', label: 'Father1'},
    {value: 'Mother1', label: 'Mother1'},
    {value: 'Orion1', label: 'Orion1'},
    {value: 'Syntherion1', label: 'Syntherion1'},
    {value: 'Agathia1', label: 'Agathia1'},
    {value: 'Aiakos2', label: 'Aiakos2'},
    {value: 'Goreshade1', label: 'Goreshade1'},
    {value: 'Goreshade2', label: 'Goreshade2'},
    {value: 'Goreshade3', label: 'Goreshade3'},
    {value: 'Asphyxious1', label: 'Asphyxious1'},
    {value: 'Asphyxious2', label: 'Asphyxious2'},
    {value: 'Asphyxious3', label: 'Asphyxious3'},
    {value: 'Terminus1', label: 'Terminus1'},
    {value: 'Venethrax1', label: 'Venethrax1'},
    {value: 'Scaverous1', label: 'Scaverous1'},
    {value: 'Mortenebra1', label: 'Mortenebra1'},
    {value: 'Mortenebra2', label: 'Mortenebra2'},
    {value: 'Skarre1', label: 'Skarre1'},
    {value: 'Skarre2', label: 'Skarre2'},
    {value: 'Sturgis2', label: 'Sturgis2'},
    {value: 'Deneghra1', label: 'Deneghra1'},
    {value: 'Deneghra2', label: 'Deneghra2'},
    {value: 'Deneghra3', label: 'Deneghra3'},
    {value: 'Coven1', label: 'Coven1'},
    {value: 'Agha1', label: 'Agha1'},
    {value: 'Agha2', label: 'Agha2'},
    {value: 'Old Witch2(Khador)', label: 'Old Witch2(Khador)'},
    {value: 'Butcher1', label: 'Butcher1'},
    {value: 'Butcher2', label: 'Butcher2'},
    {value: 'Butcher3', label: 'Butcher3'},
    {value: 'Harkevich1', label: 'Harkevich1'},
    {value: 'Irusk1', label: 'Irusk1'},
    {value: 'Irusk2', label: 'Irusk2'},
    {value: 'Karchev1', label: 'Karchev1'},
    {value: 'Malakov2', label: 'Malakov2'},
    {value: 'Sorscha1', label: 'Sorscha1'},
    {value: 'Sorscha2', label: 'Sorscha2'},
    {value: 'Strakhov1', label: 'Strakhov1'},
    {value: 'Strakhov2', label: 'Strakhov2'},
    {value: 'Vladimir1', label: 'Vladimir1'},
    {value: 'Vladimir2', label: 'Vladimir2'},
    {value: 'Vladimir3', label: 'Vladimir3'},
    {value: 'Zerkova1', label: 'Zerkova1'},
    {value: 'Zerkova2', label: 'Zerkova2'},
    {value: 'Kozlov1', label: 'Kozlov1'},
    {value: 'Amon1', label: 'Amon1'},
    {value: 'Durant2', label: 'Durant2'},
    {value: 'Durst1', label: 'Durst1'},
    {value: 'Harbinger1', label: 'Harbinger1'},
    {value: 'Feora1', label: 'Feora1'},
    {value: 'Feora2', label: 'Feora2'},
    {value: 'Feora3', label: 'Feora3'},
    {value: 'Kreoss1', label: 'Kreoss1'},
    {value: 'Kreoss2', label: 'Kreoss2'},
    {value: 'Kreoss3', label: 'Kreoss3'},
    {value: 'Malekus1', label: 'Malekus1'},
    {value: 'Reclaimer1', label: 'Reclaimer1'},
    {value: 'Reclaimer2', label: 'Reclaimer2'},
    {value: 'Reznik1', label: 'Reznik1'},
    {value: 'Reznik2', label: 'Reznik2'},
    {value: 'Severius1', label: 'Severius1'},
    {value: 'Severius2', label: 'Severius2'},
    {value: 'Thyra1', label: 'Thyra1'},
    {value: 'Vindictus1', label: 'Vindictus1'},
    {value: 'Ashlynn1', label: 'Ashlynn1'},
    {value: 'Blaize1(Merc)', label: 'Blaize1(Merc)'},
    {value: 'Caine3(Merc)', label: 'Caine3(Merc)'},
    {value: 'Cyphon1', label: 'Cyphon1'},
    {value: 'Damiano1', label: 'Damiano1'},
    {value: 'Fiona1', label: 'Fiona1'},
    {value: 'Grundback1', label: 'Grundback1'},
    {value: 'MacBain1', label: 'MacBain1'},
    {value: 'Madhammer1', label: 'Madhammer1'},
    {value: 'Magnus1', label: 'Magnus1'},
    {value: 'Magnus2', label: 'Magnus2'},
    {value: 'Montador1', label: 'Montador1'},
    {value: 'Ossrum1', label: 'Ossrum1'},
    {value: 'Shae1', label: 'Shae1'},
    {value: 'Thexus1', label: 'Thexus1'},
    {value: 'Elara2', label: 'Elara2'},
    {value: 'Garryth1', label: 'Garryth1'},
    {value: 'Goreshade4(Ret)', label: 'Goreshade4(Ret)'},
    {value: 'Helynna1', label: 'Helynna1'},
    {value: 'Issyria1', label: 'Issyria1'},
    {value: 'Kaelyssa1', label: 'Kaelyssa1'},
    {value: 'Ossyan1', label: 'Ossyan1'},
    {value: 'Rahn1', label: 'Rahn1'},
    {value: 'Ravyn1', label: 'Ravyn1'},
    {value: 'Thyron1', label: 'Thyron1'},
    {value: 'Vyros1', label: 'Vyros1'},
    {value: 'Vyros2', label: 'Vyros2'},
    {value: 'Baldur1', label: 'Baldur1'},
    {value: 'Baldur2', label: 'Baldur2'},
    {value: 'Bradigus1', label: 'Bradigus1'},
    {value: 'Grayle1', label: 'Grayle1'},
    {value: 'Kaya1', label: 'Kaya1'},
    {value: 'Kaya2', label: 'Kaya2'},
    {value: 'Kaya3', label: 'Kaya3'},
    {value: 'Kromac1', label: 'Kromac1'},
    {value: 'Kromac2', label: 'Kromac2'},
    {value: 'Krueger1', label: 'Krueger1'},
    {value: 'Krueger2', label: 'Krueger2'},
    {value: 'Mohsar1', label: 'Mohsar1'},
    {value: 'Morvahna1', label: 'Morvahna1'},
    {value: 'Morvahna2', label: 'Morvahna2'},
    {value: 'Tanith1', label: 'Tanith1'},
    {value: 'Una2', label: 'Una2'},
    {value: 'Wurmwood1', label: 'Wurmwood1'},
    {value: 'Old Witch2', label: 'Old Witch2'},
    {value: 'The Heretic', label: 'The Heretic'},
    {value: 'The Dreamer', label: 'The Dreamer'},
    {value: 'The Child', label: 'The Child'},
    {value: 'The King of Nothing', label: 'The King of Nothing'},
    {value: 'The Wanderer', label: 'The Wanderer'},
    {value: 'Absylonia1', label: 'Absylonia1'},
    {value: 'Absylonia2', label: 'Absylonia2'},
    {value: 'Bethayne1', label: 'Bethayne1'},
    {value: 'Fyanna2', label: 'Fyanna2'},
    {value: 'Kallus1', label: 'Kallus1'},
    {value: 'Kallus2', label: 'Kallus2'},
    {value: 'Kryssa1', label: 'Kryssa1'},
    {value: 'Lylyth1', label: 'Lylyth1'},
    {value: 'Lylyth2', label: 'Lylyth2'},
    {value: 'Lylyth3', label: 'Lylyth3'},
    {value: 'Rhyas1', label: 'Rhyas1'},
    {value: 'Saeryn1', label: 'Saeryn1'},
    {value: 'Twins1', label: 'Twins1'},
    {value: 'Thagrosh1', label: 'Thagrosh1'},
    {value: 'Thagrosh2', label: 'Thagrosh2'},
    {value: 'Vayl1', label: 'Vayl1'},
    {value: 'Vayl2', label: 'Vayl2'},
    {value: 'Arkadius1', label: 'Arkadius1'},
    {value: 'Barnabas1', label: 'Barnabas1'},
    {value: 'Calaban1', label: 'Calaban1'},
    {value: 'Carver1', label: 'Carver1'},
    {value: 'Helga1', label: 'Helga1'},
    {value: 'Jaga-Jaga1', label: 'Jaga-Jaga1'},
    {value: 'Maelok1', label: 'Maelok1'},
    {value: 'Midas1', label: 'Midas1'},
    {value: 'Rask1', label: 'Rask1'},
    {value: 'Sturm & Drang1', label: 'Sturm & Drang1'},
    {value: 'Hexeris1', label: 'Hexeris1'},
    {value: 'Hexeris2', label: 'Hexeris2'},
    {value: 'Jallam1', label: 'Jallam1'},
    {value: 'Makeda1', label: 'Makeda1'},
    {value: 'Makeda2', label: 'Makeda2'},
    {value: 'Makeda3', label: 'Makeda3'},
    {value: 'Mordikaar1', label: 'Mordikaar1'},
    {value: 'Morghul1', label: 'Morghul1'},
    {value: 'Morghul2', label: 'Morghul2'},
    {value: 'Morghul3', label: 'Morghul3'},
    {value: 'Rasheth1', label: 'Rasheth1'},
    {value: 'Xekaar1', label: 'Xekaar1'},
    {value: 'Xerxis1', label: 'Xerxis1'},
    {value: 'Xerxis2', label: 'Xerxis2'},
    {value: 'Zaadesh2', label: 'Zaadesh2'},
    {value: 'Zaal1', label: 'Zaal1'},
    {value: 'Zaal2', label: 'Zaal2'},
    {value: 'Borka1', label: 'Borka1'},
    {value: 'Borka2', label: 'Borka2'},
    {value: 'Calandra1', label: 'Calandra1'},
    {value: 'Doomshaper1', label: 'Doomshaper1'},
    {value: 'Doomshaper2', label: 'Doomshaper2'},
    {value: 'Doomshaper3', label: 'Doomshaper3'},
    {value: 'Horgle2', label: 'Horgle2'},
    {value: 'Jarl1', label: 'Jarl1'},
    {value: 'Gunnbjorn1', label: 'Gunnbjorn1'},
    {value: 'Grim1', label: 'Grim1'},
    {value: 'Grim2', label: 'Grim2'},
    {value: 'Grissel1', label: 'Grissel1'},
    {value: 'Grissel2', label: 'Grissel2'},
    {value: 'Madrak1', label: 'Madrak1'},
    {value: 'Madrak2', label: 'Madrak2'},
    {value: 'Madrak3', label: 'Madrak3'},
    {value: 'Ragnor1', label: 'Ragnor1'},
  ];
}




export function getWmHoCaster(faction: string): string[] {

  if (faction === 'Cygnar') {
    return ['Blaize1 (Constance Blaize, Knight of the Prophet)',
      'Brisbane1 (Major Markus \'Siege\' Brisbane)',
      'Brisbane2 (Colonel Markus \'Siege\' Brisbane)',
      'Caine1 (Lieutenant Allister Caine)',
      'Caine2 (Captain Allister Caine)',
      'Caine3 (Caine\'s Hellslingers)',
      'Darius1 (Captain E. Dominic Darius & Halfjacks)',
      'Haley1 (Captain Victoria Haley)',
      'Haley2 (Major Victoria Haley)',
      'Haley3 (Major Prime Victoria Haley)',
      'Kraye1 (Captain Jeremiah Kraye)',
      'Maddox1 (Major Beth Maddox)',
      'Nemo1 (Commander Adept Sebastian Nemo)',
      'Nemo2 (General Adept Sebastian Nemo)',
      'Nemo3 (Artificer General Nemo)',
      'Sloan1 (Captain Kara Sloan)',
      'Stryker1 (Commander Coleman Stryker)',
      'Stryker2 (Lord Commander Stryker)',
      'Stryker3 (Lord General Coleman Stryker)',
      'Sturgis1 (Commander Dalin Sturgis)'
    ];
  } else if (faction === 'Convergence') {
    return [
      'Aurora1 (Aurora, Numen of Aerogenesis)',
      'Axis1 (Axis, The Harmonic Enforcer)',
      'Father1 (Father Lucant, Divinity Architect)',
      'Iron Mother1 (Iron Mother Directrix & Exponent Servitors)',
      'Syntherion1 (Forge Master Syntherion)',
    ];
  } else if (faction === 'Cryx') {
    return [
      'Agathia1 (Bane Witch Agathia)',
      'Aiakos2 (Captain Aiakos)',
      'Goreshade1 (Goreshade the Bastard & Deathwalker)',
      'Goreshade2 (Goreshade the Cursed)',
      'Goreshade3 (Goreshade, Lord of Ruin)',
      'Asphyxious1 (Iron Lich Asphyxious)',
      'Asphyxious2 (Lich Lord Asphyxious)',
      'Asphyxious3 (Asphyxious the Hellbringer & Vociferon)',
      'Terminus1 (Lich Lord Terminus)',
      'Venethrax1 (Lich Lord Venethrax)',
      'Scaverous1 (Lord Exhumator Scaverous)',
      'Mortenebra1 (Master Necrotech Mortenebra & Deryliss)',
      'Mortenebra2 (Mortenebra, Numen of Necrogenesis)',
      'Skarre1 (Pirate Queen Skarre)',
      'Skarre2 (Skarre, Queen of the Broken Coast)',
      'Sturgis2 (Sturgis the Corrupted)',
      'Deneghra1 (Warwitch Deneghra)',
      'Deneghra2 (Wraith Witch Deneghra)',
      'Deneghra3 (Deneghra, the Soul Weaver)',
      'Coven1 (Witch Coven of Garlghast & the Egregore)'
    ];
  } else if (faction === 'Khador') {
    return [
      'Agha1 (The Old Witch of Khador & Scrapjack)',
      'Agha2 (Zevanna Agha, The Fate Keeper)',
      'Butcher1 (Orsus Zoktavir, The Butcher of Khardov)',
      'Butcher2 (Kommander Orsus Zoktavir)',
      'Butcher3 (Kommander Zoktavir, The Butcher Unleashed)',
      'Harkevich1 (Kommander Harkevich, the Iron Wolf)',
      'Irusk1 (Kommandmant Irusk)',
      'Irusk2 (Supreme Kommandant Irusk)',
      'Karchev1 (Karchev the Terrible)',
      'Malakov2 (Kommander Andrei Malakov)',
      'Sorscha1 (Kommander Sorscha)',
      'Sorscha2 (Forward Kommander Sorscha)',
      'Strakhov1 (Kommander Oleg Strakhov)',
      'Strakhov2 (Assault Kommander Strakhov and Kommandos)',
      'Vladimir1 (Vladimir Tzepesci, the Dark Prince)',
      'Vladimir2 (Vladimir Tzepesci, the Dark Champion)',
      'Vladimir3 (Vladimir Tzepesci, Great Prince of Umbrey)',
      'Zerkova1 (Koldun Kommander Aleksandra Zerkova)',
      'Zerkova2 (Obavnik Kommander Zerkova & Reaver Guard)',
      'Kozlov1 (Lord Kozlov, Viscount of Scarsgrad)'
    ];
  } else if (faction === 'Menoth') {
    return [
      'Amon1 (High Allegiant Amon Ad-Raza)',
      'Durant2 (Sovereign Tristan Durant)',
      'Durst1 (Anson Durst, Rock of the Faith)',
      'Harbinger1 (The Harbinger of Menoth)',
      'Feora1 (Feora, Priestess of the Flame)',
      'Feora2 (Feora, Protector of the Flame)',
      'Feora3 (Feora, The Conquering Flame)',
      'Kreoss1 (High Exemplar Kreoss)',
      'Kreoss2 (Grand Exemplar Kreoss)',
      'Kreoss3 (Intercessor Kreoss)',
      'Malekus1 (Malekus, The Burning Truth)',
      'Reclaimer1 (The High Reclaimer)',
      'Reclaimer2 (Testament of Menoth)',
      'Reznik1 (High Executioner Servath Reznik)',
      'Reznik2 (Servath Reznik, Wrath of Ages)',
      'Severius1 (Grand Scrutator Severius)',
      'Severius2 (Hierarch Severius)',
      'Thyra1 (Thyra, Flame of Sorrow)',
      'Vindictus1 (Vice Scrutator Vindictus)'
    ];
  } else if (faction === 'Mercenaries') {
    return [
      'Ashlynn1 (Ashlynn D\'Elyse)',
      'Blaize1 (Constance Blaize, Knight of the Prophet)',
      'Caine3 (Caine\'s Hellslingers)',
      'Cyphon1 (Cognifex Cyphon)',
      'Damiano1 (Captain Damiano)',
      'Fiona1 (Fiona the Black)',
      'Grundback1 (Gorten Grundback)',
      'MacBain1 (Drake MacBain)',
      'Madhammer1 (Durgen Madhammer)',
      'Magnus1 (Magnus the Traitor)',
      'Magnus2 (Magnus the Warlord)',
      'Montador1 (Captain Bartolo Montador)',
      'Ossrum1 (General Ossrum)',
      'Shae1 (Captain Phinneus Shae)',
      'Thexus1 (Exulon Thexus)',
    ];
  } else if (faction === 'Retribution') {
    return [
      'Elara2 (Elara, Death\'s Shadow)',
      'Garryth1 (Garryth, Blade of Retribution)',
      'Goreshade4 (Lord Ghyrrshyld, the Forgiven)',
      'Helynna1 (Magister Helynna)',
      'Issyria1 (Issyria, Sibyl of Dawn)',
      'Kaelyssa1 (Kaelyssa, Night\'s Whisper)',
      'Ossyan1 (Lord Arcanist Ossyan)',
      'Rahn1 (Adeptis Rahn)',
      'Ravyn1 (Ravyn, Eternal Light)',
      'Thyron1 (Thyron, Sword of Truth)',
      'Vyros1 (Dawnlord Vyros)',
      'Vyros2 (Vyros, Incissar of the Dawnguard)',
    ];
  } else if (faction === 'Circle') {
    return [
      'Baldur1 (Baldur the Stonecleaver)',
      'Baldur2 (Baldur the Stonesoul)',
      'Bradigus1 (Bradigus Thorle the Runecarver)',
      'Grayle1 (Grayle the Farstrider)',
      'Kaya1 (Kaya the Wildborne)',
      'Kaya2 (Kaya the Moonhunter & Laris)',
      'Kaya3 (Kaya the Wildheart)',
      'Kromac1 (Kromac the Ravenous)',
      'Kromac2 (Kromac, Champion of the Wurm)',
      'Krueger1 (Krueger the Stormwrath)',
      'Krueger2 (Krueger the Stormlord)',
      'Mohsar1 (Mohsar the Desertwalker)',
      'Morvahna1 (Morvahna the Autumnblade)',
      'Morvahna2 (Morvahna the Dawnshadow)',
      'Tanith1 (Tanith the Feral Song)',
      'Una2 (Una the Skyhunter)',
      'Wurmwood1 (Wurmwood, Tree of Fate & Cassius the Oathkeeper)'
    ];
  } else if (faction === 'Grymkin') {
    return [
      'Old Witch3 (Zevanna Agha, The Fate Keeper)',
      'The Heretic',
      'The Dreamer',
      'The Child',
      'The King of Nothing',
      'The Wanderer'
    ];
  } else if (faction === 'Legion') {
    return [
      'Absylonia1 (Absylonia, Terror of Everblight)',
      'Absylonia2 (Absylonia, Daughter of Everblight)',
      'Bethayne1 (Bethayne, Voice of Everblight and Belphagor)',
      'Fyanna1 (Fyanna, Torment of Everblight)',
      'Kallus1 (Kallus, Wrath of Everblight)',
      'Kallus2 (Kallus, Devastation of Everblight)',
      'Kryssa1 (Kryssa, Conviction of Everblight)',
      'Lylyth1 (Lylyth, Herald of Everblight)',
      'Lylyth2 (Lylyth, Shadow of Everblight)',
      'Lylyth3 (Lylyth, Reckoning of Everblight)',
      'Rhyas1 (Rhyas, Sigil of Everblight)',
      'Saeryn1 (Saeryn, Omen of Everblight)',
      'Twins1 (Saeryn & Rhyas, Talons of Everblight)',
      'Thagrosh1 (Thagrosh, Prophet of Everblight)',
      'Thagrosh2 (Thagrosh, the Messiah)',
      'Vayl1 (Vayl, Disciple of Everblight)',
      'Vayl2 (Vayl, Consul of Everblight)'
    ];
  } else if (faction === 'Minions') {
    return [
      'Arkadius1 (Dr. Arkadius)',
      'Barnabas1 (Bloody Barnabas)',
      'Calaban1 (Calaban the Grave Walker)',
      'Carver1 (Lord Carver, BMMD, Esq. III)',
      'Helga1 (Helga the Conquerer)',
      'Jaga-Jaga1 (Jaga-Jaga, the Death Charmer)',
      'Maelok1 (Maelok the Dreadbound)',
      'Midas1 (Midas)',
      'Rask1 (Rask)',
      'Sturm & Drang1 (Sturm & Drang)'
    ];
  } else if (faction === 'Skorne') {
    return [
      'Hexeris1 (Lord Tyrant Hexeris)',
      'Hexeris2 (Lord Arbiter Hexeris)',
      'Makeda1 (Archdomina Makeda)',
      'Makeda2 (Supreme Archdomina Makeda)',
      'Makeda3 (Makeda & The Exalted Court)',
      'Mordikaar1 (Void Seer Mordikaar)',
      'Morghul1 (Master Tormentor Morghoul)',
      'Morghul2 (Lord Assassin Morghoul)',
      'Morghul3 (Dominar Morghul & Escorts)',
      'Rasheth1 (Dominar Rasheth)',
      'Xekaar1 (Beast Master Xekaar)',
      'Xerxis1 (Tyrant Xerxis)',
      'Xerxis2 (Xerxis Fury of Halaak)',
      'Zaadesh2 (Lord Tyrant Zaadesh)',
      'Zaal1 (Supreme Aptimus Zaal & Kovaas)',
      'Zaal2 (Zaal, the Ancestral Advocate)',
    ];
  } else if (faction === 'Trollbloods') {
    return [
      'Borka1 (Borka Kegslayer & Keg Carrier)',
      'Borka2 (Borka, Vengeance of the Rimeshaws)',
      'Calandra1 (Calandra Truthsayer, Oracle of the Glimmerwood)',
      'Doomshaper1 (Hoarluk Doomshaper, Shaman of the Gnarls)',
      'Doomshaper2 (Hoarluk Doomshaper, Rage of Dhunia)',
      'Doomshaper3 (Hoarluk Doomshaper, Dire Prophet & Scroll Bearers)',
      'Horgle2 (Horgle, the Anvil)',
      'Jarl1 (Jarl Skuld, Devil of the Thornwood)',
      'Gunnbjorn1 (Captain Gunnbjorn)',
      'Grim1 (Grim Angus)',
      'Grim2 (Hunters Grim)',
      'Grissel1 (Grissel Bloodsong, Fell Caller)',
      'Grissel2 (Grissel Bloodsong, Marshal of the Kriels)',
      'Madrak1 (Madrak Ironhide, Thornwood Chieftain)',
      'Madrak2 (Madrak Ironhide, World Ender)',
      'Madrak3 (Madrak, Great Chieftain)',
      'Ragnor1 (Ragnor Skysplitter, the Runemaster)'
    ];
  } else {
    return ['No Caster found for Faction'];
  }
}
