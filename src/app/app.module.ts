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
  DataTableModule, DialogModule, DropdownModule, GrowlModule, InputTextModule, MessagesModule, MultiSelectModule,
  SelectButtonModule,
  SharedModule
} from "primeng/primeng";
import {ButtonModule} from "primeng/components/button/button";
import {TournamentsService} from "./services/tournaments.service";
import { TournamentAddDialogComponent } from './tournaments/tournament-add-dialog/tournament-add-dialog.component';
import {MessageService} from "primeng/components/common/messageservice";
import {SidebarModule} from "primeng/components/sidebar/sidebar";
import { PlayersComponent } from './players/players.component';
import {GameSystemService} from "./services/game-system.service";
import { PlayerAddDialogComponent } from './players/player-add-dialog/player-add-dialog.component';

export const firebaseConfig = environment.firebaseConfig;

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    TournamentsComponent,
    TournamentAddDialogComponent,
    PlayersComponent,
    PlayerAddDialogComponent
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
    MultiSelectModule
  ],
  providers: [TournamentsService, MessageService, GameSystemService],
  bootstrap: [AppComponent]
})
export class AppModule { }
