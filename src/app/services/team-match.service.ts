import {Injectable} from '@angular/core';
import {AngularFirestore} from "angularfire2/firestore";
import {Tournament} from "../models/Tournament";

import {Participant} from "../models/Participant";
import * as _ from 'lodash';
import {createEmptyParticipantMatch, ParticipantMatch} from "../models/ParticipantMatch";
import {UUID} from "angular2-uuid";
import {
  FieldValues, getGameSystemConfig, getScore, getScoreByGameSystem, getScoreForTeam, ScoreEnum
} from "../models/game-systems";

import {BatchService} from "./batch.service";
import {Team} from "../models/Team";
import {TeamMatch, TeamMatchResult} from "../models/TeamMatch";
import {ByeService} from "./bye.service";


@Injectable()
export class TeamMatchService {


  constructor(protected afs: AngularFirestore,
              protected byeService: ByeService,
              protected batchService: BatchService) {
  }

  createNextTeamRound(tournament: Tournament,
                      teamMemberMap: any,
                      allTeams: Team[],
                      allParticipants: Participant[],
                      round: number,
                      locationRestriction: boolean) {
    const that = this;
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    const shuffledTeams = _.shuffle(allTeams);
    const orderedTeams: Team[] = shuffledTeams.sort((team1, team2) => {
      let result = 0;
      if (getScore(team1) < getScore(team2)) {
        result = 1;
      } else if (getScore(team1) > getScore(team2)) {
        result = -1;
      }
      return result;
    });

    if (orderedTeams.length % 2) {
      orderedTeams.push({
        name: 'bye',
        opponentTeamNames: [],
        roundScores: [],
        sgw: []
      });

      teamMemberMap['bye'] =  {};
      for (let i = 0; i < tournament.teamSize; i ++) {
        teamMemberMap['bye'][i] = {
          name: 'bye',
          opponentParticipantsNames: [],
          roundScores: [],
          droppedInRound: 0
        };
      }

    }
    // console.log('orderedParticipants: ' + JSON.stringify(orderedParticipants));
    let newRoundTeamMatches: TeamMatch[] = [];

    const megaSuccess = this.matchTeam(orderedTeams, newRoundTeamMatches, round, locationRestriction, true);

    if (!megaSuccess) {
      console.log('distance check failed. try again without');
      newRoundTeamMatches = [];
      const success = this.matchTeam(orderedTeams, newRoundTeamMatches, round, locationRestriction, false);
      if (!success) {
        return null;
      }
    }

    _.reverse(newRoundTeamMatches);

    const batch = this.afs.firestore.batch();
    const listOfSections = _.range(1, (newRoundTeamMatches.length + 1));
    _.forEach(newRoundTeamMatches, function (newTeamMatch: TeamMatch) {

      console.log(JSON.stringify(newTeamMatch.teamOne.name) + ' VS ' + JSON.stringify(newTeamMatch.teamTwo.name));

      const uuid = UUID.UUID();
      newTeamMatch.id = uuid;
      const teamMatchDocRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teamMatches/' + uuid);
      const participantMatches: ParticipantMatch[] = [];

      _.forEach(teamMemberMap[newTeamMatch.teamOne.name], function (participantTeamOne: Participant, index: number) {

        console.log(participantTeamOne.name + ' VS ' + teamMemberMap[newTeamMatch.teamTwo.name][index].name);

        const newMatch: ParticipantMatch =
          createEmptyParticipantMatch(round, participantTeamOne, teamMemberMap[newTeamMatch.teamTwo.name][index]);

        newMatch.id = UUID.UUID();
        newMatch.table = index + 1;

        _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
          newMatch[scoreField.fieldPlayerOne] =  scoreField.defaultValue;
          newMatch[scoreField.fieldPlayerTwo] =  scoreField.defaultValue;
        });

        if (newTeamMatch.teamOne.name === 'bye') {
          that.byeService.modifyParticipantMatchAgainstPlayerOneBye(tournament, newMatch, allParticipants, batch);
        }
        if (newTeamMatch.teamTwo.name === 'bye') {
          that.byeService.modifyParticipantMatchAgainstPlayerTwoBye(tournament, newMatch, allParticipants, batch);
        }

        participantMatches.push(newMatch);
      });

      if (newTeamMatch.teamOne.name === 'bye') {
        that.byeService.modifyTeamMatchAgainstTeamOneBye(tournament, newTeamMatch, allTeams, batch);
      }

      if (newTeamMatch.teamTwo.name === 'bye') {
        that.byeService.modifyTeamMatchAgainstTeamTwoBye(tournament, newTeamMatch, allTeams, batch);
      }

      const randomIndex = Math.floor(Math.random() * listOfSections.length);
      const sectionNumber: number = listOfSections[randomIndex];
      listOfSections.splice(randomIndex, 1);
      newTeamMatch.section = sectionNumber;
      newTeamMatch.participantMatches = participantMatches;

      // console.log('setTeamMatch: ' + JSON.stringify(newTeamMatch ));

      batch.set(teamMatchDocRef, newTeamMatch);

    });

    return batch.commit();
  }

  private matchTeam(shuffledTeams: Team[],
                    newRoundTeamMatches: TeamMatch[],
                    round: number,
                    locationRestriction: boolean,
                    distanceCheck: boolean): boolean {

    const teamsLookingForMatch = shuffledTeams.length;
    if (teamsLookingForMatch === 0) {
      return true;
    }

    let i: number;
    let j: number;

    for (i = 0; i < (shuffledTeams.length - 1); i++) {

      const team1: Team = shuffledTeams[i];

      for (j = i + 1; j < (shuffledTeams.length); j++) {

        const team2: Team = shuffledTeams[j];

        // console.log('check possible Match: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));

        const alreadyPlayingAgainstEachOther = _.includes(team1.opponentTeamNames, team2.name);

        let fromSameLocation = false;
        if (locationRestriction) {
          if (team1.location && team2.location) {
            fromSameLocation = team1.location.trim().toLowerCase() === team2.location.trim().toLowerCase();

            if (fromSameLocation) {
              // console.log('from same location skipping: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
              continue;
            }
          }
        }

        if (alreadyPlayingAgainstEachOther) {
          // console.log('alreadyPlayingAgainstEachOther: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
          continue;
        }

        if (distanceCheck) {
          if (getScoreForTeam(team1) - 1 > getScoreForTeam(team2)) {
            // console.log('score distance to high: ' + JSON.stringify(participant1) + ' vs' + JSON.stringify(participant2));
            continue;
          }
        }

        const copiesOfTeams: Team[] = _.cloneDeep(shuffledTeams);

        _.remove(copiesOfTeams, function (team: Team) {
          return team.id === team1.id ||
            team.id === team2.id;
        });

        // console.log('participants left: ' + JSON.stringify(copiesOfParticipants));

        const success = this.matchTeam(copiesOfTeams, newRoundTeamMatches, round, locationRestriction, distanceCheck);

        if (success) {
          const newMatch: TeamMatch = {
            round: round,
            teamOne: team1,
            teamTwo: team2,
            participantMatches: [],
            section: 0,
            scoreTeamOne: 0,
            scoreTeamTwo: 0,
            sgwTeamOne: 0,
            sgwTeamTwo: 0,
            result: '',
            finished: false,
            finishedParticipantGames: 0,
            matchDate: new Date(),
          };
          console.log('foundMatch: ' + JSON.stringify(newMatch));
          newRoundTeamMatches.push(newMatch);

          return true;
        }
      }
    }

    return false;
  }


  deleteTeamRound(tournament: Tournament,
                  participantsMatches: ParticipantMatch[],
                  participants: Participant[],
                  teamMatches: TeamMatch[],
                  teams: Team[]): Promise<void> {

    const that = this;
    const gameConfig = getGameSystemConfig(tournament.gameSystem);

    if (participantsMatches) {

      const batch = that.afs.firestore.batch();

      _.forEach(participantsMatches, function (match: ParticipantMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participantMatches/' + match.id);
        batch.delete(docRef);
      });
      _.forEach(teamMatches, function (match: TeamMatch) {
        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teamMatches/' + match.id);
        batch.delete(docRef);
      });

      _.forEach(participants, function (participant: Participant) {

        // console.log('before participant:' + JSON.stringify(participant));

        _.forEach(gameConfig.standingFields, function (fieldValues: FieldValues) {
          participant[fieldValues.field].splice((tournament.actualRound - 1), 1);
        });
        participant.roundScores.splice((tournament.actualRound - 1), 1);
        participant.opponentParticipantsNames.splice((tournament.actualRound - 1), 1);

        // console.log('after participant:' + JSON.stringify(participant));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participant.id);
        batch.update(docRef, participant);
      });

      _.forEach(teams, function (team: Team) {

         // console.log('before team:' + JSON.stringify(team));

        _.forEach(gameConfig.standingFields, function (fieldValue: FieldValues) {
          if (fieldValue.isTeam) {
            team[fieldValue.field].splice((tournament.actualRound - 1), 1);
          }
        });
        team.sgw.splice((tournament.actualRound - 1), 1);
        team.roundScores.splice((tournament.actualRound - 1), 1);
        team.opponentTeamNames.splice((tournament.actualRound - 1), 1);

        // console.log('after team:' + JSON.stringify(team));

        const docRef = that.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + team.id);
        batch.update(docRef, team);
      });

      return batch.commit();
    }
    return null;
  }

  playerOneWon(tournament: Tournament, teamMatch: TeamMatch,
             partiMatch: ParticipantMatch, participantsMap: any, teamsMap: any) {
    console.log('PlayerOneWon');

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // TeamOne
    const teamOneToUpdate: Team = teamsMap[partiMatch.participantOne.team];
    // TeamTwo
    const teamTwoToUpdate: Team = teamsMap[partiMatch.participantTwo.team];
    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    teamMatch.sgwTeamOne = teamMatch.sgwTeamOne ? (teamMatch.sgwTeamOne + 1) : 1;
    teamOneToUpdate.sgw[teamMatch.round - 1] = teamOneToUpdate.sgw[teamMatch.round - 1] ?
      (teamOneToUpdate.sgw[teamMatch.round - 1] + 1) : 1;

    // participantMatch was finished before
    if (partiMatch.finished) {
      teamMatch.sgwTeamTwo = teamMatch.sgwTeamTwo ? (teamMatch.sgwTeamTwo - 1) : 0;

      if (partiMatch.result === 'p2') {
        teamTwoToUpdate.sgw[teamMatch.round - 1] = teamTwoToUpdate.sgw[teamMatch.round - 1] ?
          (teamTwoToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      }
    } else {
      teamMatch.finishedParticipantGames = teamMatch.finishedParticipantGames + 1;
    }

    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.WON];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }
    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.LOOSE];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }


    partiMatch.scoreParticipantOne = scorePerGameSystem[ScoreEnum.WON];
    partiMatch.scoreParticipantTwo = scorePerGameSystem[ScoreEnum.LOOSE];
    partiMatch.result = 'p1';
    partiMatch.finished = true;

    this.handleTeamMatchFinished(teamOneToUpdate, teamTwoToUpdate, teamMatch, tournament);
    this.updateTeamMatch(tournament, teamOneToUpdate, teamTwoToUpdate, participantOneToUpdate, participantTwoToUpdate, teamMatch);
  }

  playerTwoWon(tournament: Tournament, teamMatch: TeamMatch,
               partiMatch: ParticipantMatch, participantsMap: any, teamsMap: any) {
    console.log('PlayerTwoWon');

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // TeamOne
    const teamOneToUpdate: Team = teamsMap[partiMatch.participantOne.team];
    // TeamTwo
    const teamTwoToUpdate: Team = teamsMap[partiMatch.participantTwo.team];
    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    teamMatch.sgwTeamTwo = teamMatch.sgwTeamTwo ? (teamMatch.sgwTeamTwo + 1) : 1;
    teamTwoToUpdate.sgw[teamMatch.round - 1] = teamTwoToUpdate.sgw[teamMatch.round - 1] ?
      (teamTwoToUpdate.sgw[teamMatch.round - 1] + 1) : 1;
    // participantMatch was finished before
    if (partiMatch.finished) {
      teamMatch.sgwTeamOne = teamMatch.sgwTeamOne ? (teamMatch.sgwTeamOne - 1) : 0;

      if (partiMatch.result === 'p1') {
        teamOneToUpdate.sgw[teamMatch.round - 1] = teamOneToUpdate.sgw[teamMatch.round - 1] ?
          (teamOneToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      }
    } else {
      teamMatch.finishedParticipantGames = teamMatch.finishedParticipantGames + 1;
    }

    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.LOOSE];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.WON];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }

    partiMatch.scoreParticipantOne = scorePerGameSystem[ScoreEnum.LOOSE];
    partiMatch.scoreParticipantTwo = scorePerGameSystem[ScoreEnum.WON];
    partiMatch.result = 'p2';
    partiMatch.finished = true;

    this.handleTeamMatchFinished(teamOneToUpdate, teamTwoToUpdate, teamMatch, tournament);
    this.updateTeamMatch(tournament, teamOneToUpdate, teamTwoToUpdate, participantOneToUpdate, participantTwoToUpdate, teamMatch);
  }

  resultDraw(tournament: Tournament, teamMatch: TeamMatch,
                partiMatch: ParticipantMatch, participantsMap: any, teamsMap: any) {
    console.log(partiMatch + ' DRAW');

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // TeamOne
    const teamOneToUpdate: Team = teamsMap[partiMatch.participantOne.team];
    // TeamTwo
    const teamTwoToUpdate: Team = teamsMap[partiMatch.participantTwo.team];
    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    // participantMatch was finished before
    if (partiMatch.finished) {
      teamMatch.sgwTeamOne = teamMatch.sgwTeamOne ? (teamMatch.sgwTeamOne - 1) : 0;
      teamMatch.sgwTeamTwo = teamMatch.sgwTeamTwo ? (teamMatch.sgwTeamTwo - 1) : 0;

      if (partiMatch.result === 'p1') {
        teamOneToUpdate.sgw[teamMatch.round - 1] = teamOneToUpdate.sgw[teamMatch.round - 1] ?
          (teamOneToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      } else if (partiMatch.result === 'p2') {
        teamTwoToUpdate.sgw[teamMatch.round - 1] = teamTwoToUpdate.sgw[teamMatch.round - 1] ?
          (teamTwoToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      }

    } else {
      teamMatch.finishedParticipantGames = teamMatch.finishedParticipantGames + 1;
    }

    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.DRAW];
      participantOneToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantTwo.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = participantOneToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantOneToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores[partiMatch.round - 1] = scorePerGameSystem[ScoreEnum.DRAW];
      participantTwoToUpdate.opponentParticipantsNames[partiMatch.round - 1] = partiMatch.participantOne.name;

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = participantTwoToUpdate[scoreField.field][partiMatch.round - 1] ?
          participantTwoToUpdate[scoreField.field][partiMatch.round - 1] : scoreField.defaultValue;
      });
    }

    partiMatch.scoreParticipantOne = scorePerGameSystem[ScoreEnum.DRAW];
    partiMatch.scoreParticipantTwo = scorePerGameSystem[ScoreEnum.DRAW];
    partiMatch.result = 'draw';
    partiMatch.finished = true;

    this.handleTeamMatchFinished(teamOneToUpdate, teamTwoToUpdate, teamMatch, tournament);
    this.updateTeamMatch(tournament, teamOneToUpdate, teamTwoToUpdate, participantOneToUpdate, participantTwoToUpdate, teamMatch);
  }



  clearParticipantMatch(tournament: Tournament, teamMatch: TeamMatch,
                        partiMatch: ParticipantMatch, participantsMap: any, teamsMap: any) {

    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    // TeamOne
    const teamOneToUpdate: Team = teamsMap[partiMatch.participantOne.team];
    // TeamTwo
    const teamTwoToUpdate: Team = teamsMap[partiMatch.participantTwo.team];
    // PlayerOne
    const participantOneToUpdate: Participant = participantsMap[partiMatch.participantOne.name];
    // PlayerTwo
    const participantTwoToUpdate: Participant = participantsMap[partiMatch.participantTwo.name];

    if (participantOneToUpdate) {
      participantOneToUpdate.roundScores.splice(teamMatch.round - 1, 1);
      participantOneToUpdate.opponentParticipantsNames.splice(teamMatch.round - 1, 1);

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = scoreField.defaultValue;
      });
    }

    if (participantTwoToUpdate) {
      participantTwoToUpdate.roundScores.splice(teamMatch.round - 1, 1);
      participantTwoToUpdate.opponentParticipantsNames.splice(teamMatch.round - 1, 1);

      _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = scoreField.defaultValue;
      });
    }

    if (partiMatch.result === 'p1') {
      teamMatch.sgwTeamOne = teamMatch.sgwTeamOne ? (teamMatch.sgwTeamOne - 1) : 0;

      if (teamOneToUpdate) {
        teamOneToUpdate.sgw[teamMatch.round - 1] = teamOneToUpdate.sgw[teamMatch.round - 1] ?
          (teamOneToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      }

    } else if (partiMatch.result === 'p2') {
      teamMatch.sgwTeamTwo = teamMatch.sgwTeamTwo ? (teamMatch.sgwTeamTwo - 1) : 0;

      if (teamTwoToUpdate) {
        teamTwoToUpdate.sgw[teamMatch.round - 1] = teamTwoToUpdate.sgw[teamMatch.round - 1] ?
          (teamTwoToUpdate.sgw[teamMatch.round - 1] - 1) : 0;
      }
    }
    _.forEach(gameSystemConfig.standingFields, function (standingField: FieldValues) {
      if (standingField.isTeam) {
        if (teamOneToUpdate) {
          teamOneToUpdate[standingField.field][partiMatch.round - 1] = standingField.defaultValue;
        }
        if (teamTwoToUpdate) {
          teamTwoToUpdate[standingField.field][partiMatch.round - 1] = standingField.defaultValue;
        }
      }
    });

    _.forEach(gameSystemConfig.scoreFields, function (scoreField: FieldValues) {
      partiMatch[scoreField.fieldPlayerOne] = scoreField.defaultValue;
      partiMatch[scoreField.fieldPlayerTwo] = scoreField.defaultValue;

      if (participantOneToUpdate) {
        participantOneToUpdate[scoreField.field][partiMatch.round - 1] = scoreField.defaultValue;
      }
      if (participantTwoToUpdate) {
        participantTwoToUpdate[scoreField.field][partiMatch.round - 1] = scoreField.defaultValue;
      }
    });

    _.forEach(gameSystemConfig.choosePlayed, function (choosePlayed: FieldValues) {
      partiMatch[choosePlayed.fieldPlayerOne] = choosePlayed.defaultValue;
      partiMatch[choosePlayed.fieldPlayerTwo] = choosePlayed.defaultValue;
    });
    partiMatch.scoreParticipantOne = 0;
    partiMatch.scoreParticipantTwo = 0;
    partiMatch.result = '';
    partiMatch.finished = false;

    teamMatch.finished = false;
    teamMatch.finishedParticipantGames = teamMatch.finishedParticipantGames - 1;
    teamMatch.result = '';
    this.updateTeamMatch(tournament, teamOneToUpdate, teamTwoToUpdate, participantOneToUpdate, participantTwoToUpdate, teamMatch);

  }

  private handleTeamMatchFinished(teamOne: Team, teamTwo: Team, teamMatch: TeamMatch, tournament: Tournament) {

    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);
    const gameSystemConfig = getGameSystemConfig(tournament.gameSystem);

    if (teamMatch.finishedParticipantGames >= tournament.teamSize) {
      teamMatch.finished = true;

      teamOne.opponentTeamNames[teamMatch.round - 1] = teamTwo.name;
      if (!teamOne['sgw'][teamMatch.round - 1]) {
        teamOne['sgw'][teamMatch.round - 1] = 0;
      }

      _.forEach(gameSystemConfig.standingFields, function (standingField: FieldValues) {
        if (standingField.isTeam) {
          teamOne[standingField.field][teamMatch.round - 1] = standingField.defaultValue;
        }
      });

      teamTwo.opponentTeamNames[teamMatch.round - 1] = teamOne.name;
      if (!teamTwo['sgw'][teamMatch.round - 1]) {
        teamTwo['sgw'][teamMatch.round - 1] = 0;
      }
      _.forEach(gameSystemConfig.standingFields, function (standingField: FieldValues) {
        if (standingField.isTeam) {
          teamTwo[standingField.field][teamMatch.round - 1] = standingField.defaultValue;
        }
      });

      if (teamMatch.sgwTeamOne > teamMatch.sgwTeamTwo) {
        teamMatch.result = TeamMatchResult.teamOneWin;
        teamMatch.scoreTeamOne = scorePerGameSystem[ScoreEnum.WON];
        teamMatch.scoreTeamTwo = scorePerGameSystem[ScoreEnum.LOOSE];

        teamOne.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.WON];
        teamTwo.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.LOOSE];
      } else if (teamMatch.sgwTeamOne < teamMatch.sgwTeamTwo) {
        teamMatch.result = TeamMatchResult.teamTwoWin;
        teamMatch.scoreTeamOne = scorePerGameSystem[ScoreEnum.LOOSE];
        teamMatch.scoreTeamTwo = scorePerGameSystem[ScoreEnum.WON];

        teamOne.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.LOOSE];
        teamTwo.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.WON];
      } else {
        teamMatch.result = TeamMatchResult.draw;
        teamMatch.scoreTeamOne = scorePerGameSystem[ScoreEnum.DRAW];
        teamMatch.scoreTeamTwo = scorePerGameSystem[ScoreEnum.DRAW];

        teamOne.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.DRAW];
        teamTwo.roundScores[teamMatch.round - 1] = scorePerGameSystem[ScoreEnum.DRAW];
      }
       // console.log('team match finished: ' + JSON.stringify(teamMatch));
    }
  }

  private updateTeamMatch(tournament: Tournament, teamOneToUpdate: Team,
                          teamTwoToUpdate: Team, participantOneToUpdate: Participant,
                          participantTwoToUpdate: Participant, teamMatch: TeamMatch) {

    if (teamOneToUpdate) {
      const teamOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + teamOneToUpdate.id);
      this.batchService.update(teamOneDocRef, teamOneToUpdate);
    }

    if (teamTwoToUpdate) {
      const teamTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + teamTwoToUpdate.id);
      this.batchService.update(teamTwoDocRef, teamTwoToUpdate);
    }

    if (participantOneToUpdate) {
      const participantOneDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
      this.batchService.update(participantOneDocRef, participantOneToUpdate);
    }

    if (participantTwoToUpdate) {
      const participantTwoDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
      this.batchService.update(participantTwoDocRef, participantTwoToUpdate);
    }
    const teamMatchDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/teamMatches/' + teamMatch.id);
    this.batchService.update(teamMatchDocRef, teamMatch);
  }
}
