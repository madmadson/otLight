import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {SelectItem} from "primeng/primeng";
import {MessageService} from "primeng/components/common/messageservice";
import {AngularFirestore} from "angularfire2/firestore";
import {getGameSystems} from "../../models/game-systems";

@Component({
  selector: 'app-player-add-dialog',
  templateUrl: './player-add-dialog.component.html',
  styleUrls: ['./player-add-dialog.component.scss']
})
export class PlayerAddDialogComponent implements OnInit {

  @Output() onPlayerSaved = new EventEmitter<any>();

  protected gameSystems: SelectItem[];
  playerForm: FormGroup;


  constructor(private fb: FormBuilder,
              private messageService: MessageService,
              private afs: AngularFirestore) {
    this.gameSystems = getGameSystems();
  }

  ngOnInit() {

    this.playerForm = this.fb.group({
      'name': new FormControl('', Validators.required),
      'gameSystems': new FormControl([]),
    });
  }

  onSubmit() {

    const that = this;

    console.log('gameSystems: '  + JSON.stringify(this.playerForm.value.gameSystems));

    // const player: Player = {
    //   name: this.playerForm.value.name,
    //   gameSystems: {
    //     wmho: true,
    //     guildball: false
    //   }
    // };
    //
    // this.afs.firestore.collection('players').add(player).then(function (docRef) {
    //   console.log("Player written with ID: ", docRef.id);
    //
    //   that.onPlayerSaved.emit();
    //
    //   that.messageService.add({severity: 'success', summary: 'Creation', detail: 'Player created'});
    // }).catch(function (error) {
    //   console.error("Error writing Player: ", error);
    // });

  }

}
