import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {getGameSystems} from "../../models/game-systems";
import {SelectItem} from "primeng/primeng";
import {Tournament} from "../../models/Tournament";
import {AngularFirestore} from "angularfire2/firestore";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {MessageService} from "primeng/components/common/messageservice";

@Component({
  selector: 'app-tournament-add-dialog',
  templateUrl: './tournament-add-dialog.component.html',
  styleUrls: ['./tournament-add-dialog.component.scss']
})
export class TournamentAddDialogComponent implements OnInit {

  @Input() gameSystem: string;
  @Output() onTournamentSaved = new EventEmitter<any>();

  protected gameSystems: SelectItem[];
  tournamentForm: FormGroup;

  constructor(private fb: FormBuilder,
              private  messageService: MessageService,
              private afs: AngularFirestore) {
    this.gameSystems = getGameSystems();

  }

  ngOnInit() {

    this.tournamentForm = this.fb.group({
      'name': new FormControl('', Validators.required),
      'gameSystem': new FormControl({value: this.gameSystem, disabled: true}, Validators.required),
      'password': new FormControl('', Validators.minLength(6))
    });

  }

  onSubmit() {

    const that = this;

    const tournament: Tournament = {
      name: this.tournamentForm.value.name,
      password: this.tournamentForm.value.password,
      gameSystem: this.gameSystem
    };

    this.afs.firestore.collection('tournaments').add(tournament).then(function (docRef) {
      console.log("Tournament written with ID: ", docRef.id);

      that.onTournamentSaved.emit();

      that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Tournament created'});
    }).catch(function (error) {
      console.error("Error writing tournament: ", error);
    });

  }


}
