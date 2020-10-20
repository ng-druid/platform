import { Component, OnInit, Input, ViewChild, OnChanges, SimpleChanges, ElementRef, Inject } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { EntityServices, EntityCollectionService } from '@ngrx/data';
import { CONTENT_PLUGIN, ContentPlugin } from 'content';
import { ContextManagerService } from 'context';
import { PanelPage, Pane } from '../../models/page.models';
import { PanelPageForm } from '../../models/form.models';
import { PageBuilderFacade } from '../../features/page-builder/page-builder.facade';
import { DisplayGrid, GridsterConfig, GridType, GridsterItem } from 'angular-gridster2';
import { GridLayoutComponent } from '../grid-layout/grid-layout.component';
import { InlineContext } from '../../models/context.models';
import { fromEvent, Subscription, BehaviorSubject, Subject, iif, of } from 'rxjs';
import { filter, tap, debounceTime, take, skip, scan, delay } from 'rxjs/operators';
import { getSelectors, RouterReducerState } from '@ngrx/router-store';
import { Store, select } from '@ngrx/store';
import { InlineContextResolverService } from '../../services/inline-context-resolver.service';
import * as uuid from 'uuid';

@Component({
  selector: 'classifieds-ui-panel-page',
  templateUrl: './panel-page.component.html',
  styleUrls: ['./panel-page.component.scss']
})
export class PanelPageComponent implements OnInit, OnChanges {

  @Input()
  id: string;

  @Input()
  panelPage: PanelPage;

  @Input()
  nested = false;

  @Input()
  contexts: Array<InlineContext>;

  resolvedContext: any;
  contextChanged: { name: string };

  pageForm = this.fb.group({
    /*name: this.fb.control(''),
    title: this.fb.control(''),
    derivativeId: this.fb.control(''),*/
    panels: this.fb.array([])
  });

  resolveSub: Subscription;

  options: GridsterConfig = {
    gridType: GridType.Fit,
    displayGrid: DisplayGrid.None,
    pushItems: false,
    draggable: {
      enabled: false
    },
    resizable: {
      enabled: false
    },
    mobileBreakpoint: 0
  };

  private contentPlugins: Array<ContentPlugin> = [];

  private panelPageService: EntityCollectionService<PanelPage>;

  @ViewChild(GridLayoutComponent, {static: false}) gridLayout: GridLayoutComponent;

  get panelsArray(): FormArray {
    return this.pageForm.get('panels') as FormArray;
  }

  get pageIsDynamic() {
    return this.panelPage.panels.reduce<Array<[Pane, ContentPlugin]>>((p2, c) => [ ...p2, ...c.panes.map<[Pane, ContentPlugin]>(p3 => [p3, this.contentPlugins.find(cp => cp.name === p3.contentPlugin)]) ], []).find(([p2, cp]) => cp.handler && cp.handler.isDynamic(p2.settings)) !== undefined;
  }

  constructor(
    @Inject(CONTENT_PLUGIN) contentPlugins: Array<ContentPlugin>,
    private routerStore: Store<RouterReducerState>,
    private fb: FormBuilder,
    private el: ElementRef,
    private inlineContextResolver: InlineContextResolverService,
    private contextManager: ContextManagerService,
    private pageBuilderFacade:PageBuilderFacade,
    es: EntityServices,
  ) {
    this.contentPlugins = contentPlugins;
    this.panelPageService = es.getEntityCollectionService('PanelPage');
  }

  ngOnInit(): void {
    /*if(!this.nested) {
      console.log('hookup');
      const nav$ = fromEvent(this.el.nativeElement, 'click').pipe(
        //filter(evt => (evt as any).target.closest('a') !== null),
        tap(() => alert('Hello'))
      );
    }*/
    if(this.id !== undefined) {
      this.fetchPage();
    } else if(this.panelPage !== undefined) {
      this.populatePanelsFormArray();
    }
    if(!this.nested) {
      const { selectCurrentRoute } = getSelectors((state: any) => state.router);
      this.routerStore.pipe(
        select(selectCurrentRoute),
        filter(() => this.panelPage !== undefined)
      ).subscribe(route => {
          //this.panelPage = new PanelPage({ ...this.panelPage });
      });
    }
    if(this.nested && this.id === undefined) {
      this.hookupContextChange();
    }
    this.pageForm.valueChanges.pipe(
      debounceTime(100),
      filter(() => this.panelPage !== undefined && this.panelPage.displayType === 'form'),
      tap(() => console.log('page form value change'))
    ).subscribe(v => {
      const form = new PanelPageForm({ ...v, name: this.panelPage.name, title: this.panelPage.title, derivativeId: this.panelPage.id});
      this.pageBuilderFacade.setForm(this.panelPage.name, form);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if(!this.nested && !changes.id.firstChange && changes.id.previousValue !== changes.id.currentValue) {
      this.fetchPage();
    }
  }

  fetchPage() {
    this.panelPageService.getByKey(this.id).subscribe(p => {
      /*if(this.nested) {
        this.contexts =
      } else {
        this.contexts = [];
      }*/
      console.log(p);
      this.contexts = p.contexts ? p.contexts.map(c => new InlineContext(c)) : [];
      this.panelPage = p;
      this.populatePanelsFormArray();

      if(!this.nested || this.pageIsDynamic ) {
        this.hookupContextChange();
      }
    });
  }

  onHeightChange(height: number, index: number) {
    this.gridLayout.setItemContentHeight(index, height);
  }

  populatePanelsFormArray() {
    this.panelsArray.clear();
    this.panelPage.panels.forEach((p, i) => {
      this.panelsArray.push(this.fb.control(''));
    });
  }

  hookupContextChange() {
    if(this.resolveSub !== undefined) {
      this.resolveSub.unsubscribe();
    }
    this.inlineContextResolver.resolveMerged(this.contexts, `panelpage:${uuid.v4()}`).pipe(
      take(1)
    ).subscribe(resolvedContext => {
      this.resolvedContext = resolvedContext;
      console.log(this.resolvedContext);
      this.resolveSub = this.inlineContextResolver.resolveMergedSingle(this.contexts).pipe(
        skip(this.contextManager.getAll(true).length + (this.contexts ? this.contexts.length : 0))
      ).subscribe(([cName, cValue]) => {
        console.log(`context changed [${this.panelPage.name}]: ${cName}`);
        this.contextChanged = { name: cName };
        this.resolvedContext = { ...this.resolvedContext, [cName]: cValue };
      });
    });
  }

  submit() {
    const panelPage = new PanelPage(this.pageForm.value);
  }

}
