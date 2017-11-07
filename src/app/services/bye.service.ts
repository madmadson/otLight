


import {Injectable} from "@angular/core";
import {Participant} from "../models/Participant";
import {ParticipantMatch} from "../models/ParticipantMatch";
import {FieldValues, getByeScoring, getGameSystemConfig, getScoreByGameSystem} from "../models/game-systems";
import {Tournament} from "../models/Tournament";
import * as _ from 'lodash';
import * as firebase from "firebase/app";
import WriteBatch = firebase.firestore.WriteBatch;

import {AngularFirestore} from "angularfire2/firestore";
import {TeamMatch} from "../models/TeamMatch";
import {Team} from "../models/Team";

@Injectable()
export class ByeService {

  constructor(protected afs: AngularFirestore) {}

  modifyParticipantMatchAgainstPlayerOneBye(tournament: Tournament,
                                            match: ParticipantMatch,
                                            allParticipants: Participant[],
                                            batch: WriteBatch) {

    const byeScoring = getByeScoring(tournament.gameSystem);
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    match.finished = true;
    match.scoreParticipantTwo = byeScoring.score;
    match.result = 'p2';

    _.forEach(gameConfig.scoreFields, function (scoreFields: FieldValues) {
      match[scoreFields.fieldPlayerTwo] = byeScoring[scoreFields.field];
    });

    const participantTwoToUpdate: Participant = _.find(allParticipants, function (par: Participant) {
      return par.id === match.participantTwo.id;
    });

    participantTwoToUpdate.roundScores[match.round - 1] = scorePerGameSystem[0];
    participantTwoToUpdate.opponentParticipantsNames[match.round - 1] = 'bye';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      participantTwoToUpdate[scoreField.field][match.round - 1] = byeScoring[scoreField.field];
    });

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantTwoToUpdate.id);
    batch.update(participantDocRef, participantTwoToUpdate);
  }

  modifyParticipantMatchAgainstPlayerTwoBye(tournament: Tournament,
                                            match: ParticipantMatch,
                                            allParticipants: Participant[],
                                            batch: WriteBatch) {

    const byeScoring = getByeScoring(tournament.gameSystem);
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    match.finished = true;
    match.scoreParticipantOne = byeScoring.score;
    match.result = 'p1';

    _.forEach(gameConfig.scoreFields, function (scoreFields: FieldValues) {
      match[scoreFields.fieldPlayerOne] = byeScoring[scoreFields.field];
    });

    const participantOneToUpdate: Participant = _.find(allParticipants, function (par: Participant) {
      return par.id === match.participantOne.id;
    });

    participantOneToUpdate.roundScores[match.round - 1] = scorePerGameSystem[0];
    participantOneToUpdate.opponentParticipantsNames[match.round - 1] = 'bye';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      participantOneToUpdate[scoreField.field][match.round - 1] = byeScoring[scoreField.field];
    });

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/participants/' + participantOneToUpdate.id);
    batch.update(participantDocRef, participantOneToUpdate);
  }


  modifyTeamMatchAgainstTeamOneBye(tournament: Tournament,
                                            match: TeamMatch,
                                            allTeams: Team[],
                                            batch: WriteBatch) {

    const byeScoring = getByeScoring(tournament.gameSystem);
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    match.finished = true;
    match.scoreTeamTwo = byeScoring.score;
    match.result = 'p2';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      match[scoreField.fieldPlayerTwo] = (byeScoring[scoreField.field] * tournament.teamSize);
    });

    const teamTwoToUpdate: Team = _.find(allTeams, function (team: Team) {
      return team.id === match.teamTwo.id;
    });

    teamTwoToUpdate.roundScores[match.round - 1] = scorePerGameSystem[0];
    teamTwoToUpdate.opponentTeamNames[match.round - 1] = 'bye';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      teamTwoToUpdate[scoreField.field][match.round - 1] = (byeScoring[scoreField.field] * tournament.teamSize);
    });

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + teamTwoToUpdate.id);
    batch.update(participantDocRef, teamTwoToUpdate);
  }

  modifyTeamMatchAgainstTeamTwoBye(tournament: Tournament,
                                   match: TeamMatch,
                                   allTeams: Team[],
                                   batch: WriteBatch) {

    const byeScoring = getByeScoring(tournament.gameSystem);
    const gameConfig = getGameSystemConfig(tournament.gameSystem, tournament.type);
    const scorePerGameSystem = getScoreByGameSystem(tournament.gameSystem);

    match.finished = true;
    match.scoreTeamOne = byeScoring.score;
    match.result = 'p1';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      match[scoreField.fieldPlayerOne] = (byeScoring[scoreField.field] * tournament.teamSize);
    });

    const teamOneToUpdate: Team = _.find(allTeams, function (team: Team) {
      return team.id === match.teamOne.id;
    });

    teamOneToUpdate.roundScores[match.round - 1] = scorePerGameSystem[0];
    teamOneToUpdate.opponentTeamNames[match.round - 1] = 'bye';

    _.forEach(gameConfig.scoreFields, function (scoreField: FieldValues) {
      teamOneToUpdate[scoreField.field][match.round - 1] = (byeScoring[scoreField.field] * tournament.teamSize);
    });

    const participantDocRef = this.afs.firestore.doc('tournaments/' + tournament.id + '/teams/' + teamOneToUpdate.id);
    batch.update(participantDocRef, teamOneToUpdate);
  }
}
