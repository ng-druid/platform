import { Component, OnInit, Inject } from '@angular/core';
import { Validators, FormGroup, FormControl, FormArray, FormBuilder, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AttributeSerializerService } from 'attributes';
import { Rest, DatasourceOptions, mockDatasourceOptions, mockRest } from 'datasource';
import { Pane } from 'panels';
import { FormlyFieldContentHandler } from '../../handlers/formly-field-content.handler';
import { FormlyFieldInstance } from '../../models/formly.models';
@Component({
  selector: 'classifieds-formly-field-editor',
  templateUrl: './formly-field-editor.component.html',
  styleUrls: ['./formly-field-editor.component.scss']
})
export class FormlyFieldEditorComponent implements OnInit {

  rest = mockRest;
  datasourceOptions = mockDatasourceOptions;

  formGroup = this.fb.group({
    type: this.fb.control('', [ Validators.required ]),
    key: this.fb.control('', [ Validators.required ]),
    options: this.fb.group({
      label: this.fb.control('')
    }),
    rest: this.fb.control(''),
    datasourceOptions: this.fb.control('')
  });

  get paneGroup(): AbstractControl {
    return (this.data.panelFormGroup.get('panes') as FormArray).at(this.data.paneIndex);
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: { panelFormGroup: FormGroup; pane: Pane; paneIndex: number; },
    private dialogRef: MatDialogRef<FormlyFieldEditorComponent>,
    private fb: FormBuilder,
    private handler: FormlyFieldContentHandler,
    private attributeSerializer: AttributeSerializerService
  ) {}

  ngOnInit(): void {
    this.handler.toObject(this.data.pane.settings).subscribe(i => {
      this.formGroup.get('type').setValue(i.type);
      this.formGroup.get('key').setValue(i.key);
      this.formGroup.get('options').setValue(i.options ? i.options : { label: '' });
      this.rest = i.rest ? new Rest({ ...i.rest, params: [] }) : mockRest;
      this.datasourceOptions = i.datasourceOptions ? i.datasourceOptions : mockDatasourceOptions;
      setTimeout(() => this.rest = i.rest ? i.rest : mockRest);
    });
  }

  submit() {
    console.log(this.formGroup.value);
    const instance = new FormlyFieldInstance(this.formGroup.value);
    console.log(instance);
    this.paneGroup.get('name').setValue(instance.key);
    this.paneGroup.get('label').setValue(instance.key);
    (this.paneGroup.get('settings') as FormArray).clear();
    const controls = this.handler.buildSettings(instance).map(s => this.attributeSerializer.convertToGroup(s));
    controls.forEach(c => (this.paneGroup.get('settings') as FormArray).push(c));
    this.dialogRef.close();
  }

}