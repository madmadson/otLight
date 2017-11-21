import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TournamentsComponent } from './tournaments/tournaments/tournaments.component';
import {PageNotFoundComponent} from "./not-found.component";
import {AppRoutingModule} from "./app-routing.module";

import { environment } from '../environments/environment';
import {AngularFireModule} from "angularfire2";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {AngularFirestoreModule} from "angularfire2/firestore";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {
  AutoCompleteModule, ConfirmationService, ConfirmDialogModule, DataListModule,
  DataTableModule, DialogModule, DropdownModule, GrowlModule, InputSwitchModule, InputTextModule, MessagesModule,
  MultiSelectModule, OverlayPanelModule,
  PanelModule, RadioButtonModule,
  SelectButtonModule,
  SharedModule, SpinnerModule, TooltipModule
} from "primeng/primeng";
import {ButtonModule} from "primeng/components/button/button";
import {TournamentsService} from "./services/tournaments.service";
import { TournamentAddDialogComponent } from './tournaments/tournament-add-dialog/tournament-add-dialog.component';
import {MessageService} from "primeng/components/common/messageservice";
import {SidebarModule} from "primeng/components/sidebar/sidebar";
import { PlayersComponent } from './players/players.component';
import {GameSystemService} from "./services/game-system.service";
import { PlayerAddDialogComponent } from './players/player-add-dialog/player-add-dialog.component';
import { TournamentComponent } from './tournament/tournament.component';
import {ParticipantMatchService} from "./services/participant-match.service";
import {WindowRefService} from "./services/window-ref-service";
import {ConnectivityService} from "./services/connectivity-service";
import {BatchService} from "./services/batch.service";
import {TeamMatchService} from "./services/team-match.service";
import {ByeService} from "./services/bye.service";
import { ParticipantMatchesTableComponent } from './tournament/participant-matches-table/participant-matches-table.component';
import {ParticipantTeamMatchesTableComponent} from "./tournament/participant-team-matches-table/participant-team-matches-table.component";
import { ParticipantTableComponent } from './tournament/participant-table/participant-table.component';
import {TopBarMenuService} from "./services/topBarMenu.service";
import { TeamTableComponent } from './tournament/team-table/team-table.component';


export const firebaseConfig = environment.firebaseConfig;

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    TournamentsComponent,
    TournamentAddDialogComponent,
    PlayersComponent,
    PlayerAddDialogComponent,
    TournamentComponent,
    ParticipantMatchesTableComponent,
    ParticipantTeamMatchesTableComponent,
    ParticipantTableComponent,
    TeamTableComponent
  ],
  imports: [
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,

    AngularFireModule.initializeApp(firebaseConfig),
    AngularFirestoreModule,

    DropdownModule,
    DataTableModule,
    SharedModule,
    ButtonModule,
    SelectButtonModule,
    DialogModule,
    InputTextModule,
    GrowlModule,
    MessagesModule,
    SidebarModule,
    MultiSelectModule,
    PanelModule,
    AutoCompleteModule,
    TooltipModule,
    RadioButtonModule,
    SpinnerModule,
    ConfirmDialogModule,
    InputSwitchModule,
    OverlayPanelModule
  ],
  providers: [
    WindowRefService,
    ConnectivityService,
    TournamentsService,
    BatchService,
    MessageService,
    ConfirmationService,
    GameSystemService,
    ParticipantMatchService,
    TeamMatchService,
    ByeService,
    TopBarMenuService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
