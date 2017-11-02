import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PageNotFoundComponent} from "./not-found.component";
import {TournamentsComponent} from "./tournaments/tournaments/tournaments.component";
import {PlayersComponent} from "./players/players.component";
import {TournamentComponent} from "./tournament/tournament.component";


const routes: Routes = [
  { path: 'tournaments', component: TournamentsComponent },
  { path: 'tournaments/:new', component: TournamentsComponent },
  { path: 'tournament/:id', component: TournamentComponent },
  { path: 'players', component: PlayersComponent },
  { path: 'players/:new', component: PlayersComponent },
  { path: '', component: TournamentsComponent },
  {path: '**', component: PageNotFoundComponent}
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {
}
