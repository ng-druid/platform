import { Component, OnInit, Inject, Input } from '@angular/core';
import { FormGroup, FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ATTRIBUTE_WIDGET, AttributeWidget, AttributeValue, AttributeTypes, WidgetPluginManager } from 'attributes';
import { CONTENT_PLUGIN, ContentPlugin, ContentPluginManager } from 'content';
import { AttributeContentHandler } from '../../../handlers/attribute-content.handler';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Pane } from 'panels';
import { ContentSelectorComponent } from '../../../components/content-selector/content-selector.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'classifieds-ui-attribute-selector',
  templateUrl: './attribute-selector.component.html',
  styleUrls: ['./attribute-selector.component.scss']
})
export class AttributeSelectorComponent implements OnInit {

  @Input()
  panelFormGroup: FormGroup;

  attributeWidgets: Observable<Map<string, AttributeWidget<string>>>;
  // private contentPlugin: ContentPlugin;

  constructor(
    // @Inject(ATTRIBUTE_WIDGET) attributeWidgets: Array<AttributeWidget>,
    // @Inject(CONTENT_PLUGIN) contentPlugins: Array<ContentPlugin>,
    private bottomSheetRef: MatBottomSheetRef<ContentSelectorComponent>,
    private handler: AttributeContentHandler,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cpm: ContentPluginManager,
    private wpm: WidgetPluginManager
  ) {
    // this.attributeWidgets = attributeWidgets;
    // this.contentPlugin = contentPlugins.find(p => p.name === 'attribute');
  }

  ngOnInit(): void {
    this.attributeWidgets = this.wpm.getPlugins();
  }

  onItemSelect(widget: AttributeWidget<string>) {
    console.log(widget);
    (this.panelFormGroup.get('panes') as FormArray).push(this.fb.group({
      contentPlugin: 'attribute',
      name: new FormControl(''),
      label: new FormControl(''),
      rule: new FormControl(''),
      settings: this.fb.array(this.handler.widgetSettings(widget).map(s => this.fb.group({
        name: new FormControl(s.name, Validators.required),
        type: new FormControl(s.type, Validators.required),
        displayName: new FormControl(s.displayName, Validators.required),
        value: new FormControl(s.value, Validators.required),
        computedValue: new FormControl(s.computedValue, Validators.required),
      })))
    }));
    const formArray = (this.panelFormGroup.get('panes') as FormArray);
    const paneIndex = formArray.length - 1;
    const pane = new Pane(formArray.at(paneIndex).value);
    this.cpm.getPlugin('attribute').subscribe(plugin => {
      this.dialog.open(plugin.editorComponent, { data: { panelFormGroup: this.panelFormGroup, pane, paneIndex } });
    });
    this.bottomSheetRef.dismiss();
  }

}
