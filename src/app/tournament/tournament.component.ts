import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.scss']
})
export class TournamentComponent implements OnInit {
  protected tournamentId: string;

  constructor(private activeRouter: ActivatedRoute) {

    this.tournamentId = this.activeRouter.snapshot.paramMap.get('id');
  }

  ngOnInit() {
  }

}
