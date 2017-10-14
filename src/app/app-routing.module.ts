import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PageNotFoundComponent} from "./not-found.component";
import {TournamentsComponent} from "./tournaments/tournaments/tournaments.component";
import {PlayersComponent} from "./players/players.component";


const routes: Routes = [
  { path: 'tournaments', component: TournamentsComponent },
  { path: 'players', component: PlayersComponent },
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
