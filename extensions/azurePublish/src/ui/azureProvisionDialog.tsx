// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import formatMessage from 'format-message';
import * as React from 'react';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import {
  currentProjectId,
  getAccessTokensFromStorage,
  startProvision,
  closeDialog,
  onBack,
  savePublishConfig,
  setTitle,
  getSchema,
  getType,
  getCurrentUser,
} from '@bfc/extension-client';
import { Subscription } from '@azure/arm-subscriptions/esm/models';
import { ResourceGroup } from '@azure/arm-resources/esm/models';
import { DeployLocation } from '@botframework-composer/types';
import { ResourcesItem, LuisAuthoringSupportLocation, LuisPublishSupportLocation } from '../types';
import {
  ScrollablePane,
  ScrollbarVisibility,
  ChoiceGroup,
  IChoiceGroupOption,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  IGroup,
  CheckboxVisibility,
  Sticky,
  StickyPositionType,
  TooltipHost,
  Spinner,
  Persona,
  PersonaSize,
  Selection,
  SelectionMode,
} from 'office-ui-fabric-react';
import { JsonEditor } from '@bfc/code-editor';

import { getResourceList, getSubscriptions, getResourceGroups, getDeployLocations, getPreview, getLuisAuthoringRegions, getLuisPredictionRegions } from './api';

const choiceOptions: IChoiceGroupOption[] = [
  { key: 'create', text: 'Create new Azure resources' },
  { key: 'import', text: 'Import existing Azure resources' },
];
const PageTypes = {
  ConfigProvision: 'config',
  ReviewResource: 'review',
};
const DialogTitle = {
  CONFIG_RESOURCES: {
    title: formatMessage('Configure resources'),
    subText: formatMessage(
      'Composer will create your bot resources in this Azure destination. If you already have assets created then select import'
    ),
  },
  REVIEW: {
    title: formatMessage('Review + Create'),
    subText: formatMessage(
      'Please review the resources that will be created for your bot. Once these resources are provisioned, your resources will be available in your Azure profile'
    ),
  },
};

function onRenderDetailsHeader(props, defaultRender) {
  return (
    <Sticky isScrollSynced stickyPosition={StickyPositionType.Header}>
      {defaultRender({
        ...props,
        onRenderColumnHeaderTooltip: (tooltipHostProps) => <TooltipHost {...tooltipHostProps} />,
      })}
    </Sticky>
  );
}

export const AzureProvisionDialog: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [deployLocations, setDeployLocations] = useState<DeployLocation[]>([]);
  const [luisLocations, setLuisLocations] = useState<string[]>([]);

  const [token, setToken] = useState<string>();
  const [graphToken, setGraphToken] = useState<string>();
  const [currentUser, setCurrentUser] = useState<any>();

  const [choice, setChoice] = useState(choiceOptions[0]);
  const [currentSubscription, setSubscription] = useState<Subscription>();
  const [currentHostName, setHostName] = useState('');
  const [errorHostName, setErrorHostName] = useState('');
  const [currentLocation, setLocation] = useState<DeployLocation>();
  const [currentLuisLocation, setCurrentLuisLocation] = useState<string>();
  const [extensionResourceOptions, setExtensionResourceOptions] = useState<ResourcesItem[]>([]);
  const [enabledResources, setEnabledResources] = useState<ResourcesItem[]>([]); // create from optional list
  const [requireResources, setRequireResources] = useState<ResourcesItem[]>([]);

  const [isEditorError, setEditorError] = useState(false);
  const [importConfig, setImportConfig] = useState();

  const [page, setPage] = useState(PageTypes.ConfigProvision);
  const [group, setGroup] = useState<IGroup[]>();
  const [listItems, setListItem] = useState<(ResourcesItem & {name,icon})[]>();

  // set type of publish - azurePublish or azureFunctionsPublish
  const publishType = getType();

  const columns: IColumn[] = [
    {
      key: 'icon',
      name: 'File Type',
      iconName: 'Page',
      isIconOnly: true,
      fieldName: 'name',
      minWidth: 16,
      maxWidth: 16,
      onRender: (item: ResourcesItem & {name,icon}) => {
        return <img src={item.icon} />;
      },
    },
    {
      key: 'Name',
      name: formatMessage('Name'),
      className: 'name',
      fieldName: 'name',
      minWidth: 300,
      maxWidth: 350,
      isRowHeader: true,
      isResizable: true,
      data: 'string',
      onRender: (item: ResourcesItem & {name,icon}) => {
        return <div>
            {item.name}
            <div>{item.text} | {item.tier}</div>
          </div>;
      },
      isPadded: true,
    },
    {
      key: 'Description',
      name: formatMessage('Description'),
      className: 'description',
      fieldName: 'description',
      minWidth: 300,
      maxWidth: 350,
      isRowHeader: true,
      isResizable: true,
      data: 'string',
      onRender: (item: ResourcesItem & {name,icon}) => {
        return <span>{item.description}</span>;
      },
      isPadded: true,
    }
  ];

  useEffect(() => {
    setTitle(DialogTitle.CONFIG_RESOURCES);
    const { access_token, graph_token } = getAccessTokensFromStorage();
    const user = getCurrentUser();
    setToken(access_token);
    setGraphToken(graph_token);
    setCurrentUser(user);
    getSubscriptions(access_token).then(setSubscriptions);
    getResources();
  }, []);

  const getResources = async () => {
    try {
      const resources = await getResourceList(currentProjectId(), publishType);
      setExtensionResourceOptions(resources);
    } catch (err) {
      // todo: how do we handle API errors in this component
      console.log('ERROR', err);
    }
  };

  const subscriptionOption = useMemo(() => {
    console.log('GOT SUBSCRIPTIONS', subscriptions);
    return subscriptions.map((t) => ({ key: t.subscriptionId, text: t.displayName }));
  }, [subscriptions]);

  const deployLocationsOption = useMemo((): IDropdownOption[] => {
    return deployLocations.map((t) => ({ key: t.id, text: t.displayName }));
  }, [deployLocations]);

  const luisLocationsOption = useMemo((): IDropdownOption[] => {
    console.log(luisLocations);
    return luisLocations.map((t) => ({ key: t, text: t }));
  }, [luisLocations]);

  const updateCurrentSubscription = useMemo(
    () => (_e, option?: IDropdownOption) => {
      const sub = subscriptions.find((t) => t.subscriptionId === option?.key);

      if (sub) {
        setSubscription(sub);
      }
    },
    [subscriptions]
  );

  const newResourceGroup = useMemo(
    () => (e, newName) => {
      // validate existed or not
      const existed = resourceGroups.find((t) => t.name === newName);
      if (existed) {
        setErrorHostName('this resource group already exist');
      } else {
        setErrorHostName('');
        setHostName(newName);
      }
    },
    [resourceGroups]
  );

  const updateCurrentLocation = useMemo(
    () => (_e, option?: IDropdownOption) => {
      const location = deployLocations.find((t) => t.id === option?.key);

      if (location) {
        setLocation(location);
      }
    },
    [deployLocations]
  );

  const updateLuisLocation = useMemo(
    () => (_e, option?: IDropdownOption) => {
      const location = luisLocations.find((t) => t === option?.key);
      console.log(location);
      if (location) {
        setCurrentLuisLocation(location);
      }
    },
    [luisLocations]
  );

  useEffect(() => {
    if (currentSubscription) {
      // get resource group under subscription
      getResourceGroups(token, currentSubscription.subscriptionId).then(setResourceGroups);
      getDeployLocations(token, currentSubscription.subscriptionId).then(setDeployLocations);
      setLuisLocations(getLuisAuthoringRegions());
    }
  }, [currentSubscription]);

  const onNext = useMemo(
    () => (hostname) => {
      const names = getPreview(hostname);
      const result = extensionResourceOptions.map((resource) => {
        const previewObject = names.find((n) => n.key === resource.key);
        return {
          ...resource,
          name: previewObject ? previewObject.name : `UNKNOWN NAME FOR ${resource.key}`,
          icon: previewObject ? previewObject.icon : undefined,
        };
      });

      // set review list
      const groups: IGroup[] = [];
      const requireList = result.filter(item => item.required);
      setRequireResources(requireList);
      const externalList = result.filter(item => !item.required);
      groups.push({
        key: 'required',
        name: 'Required',
        startIndex: 0,
        count: requireList.length,
      });
      groups.push({
        key: 'optional',
        name: 'Optional',
        startIndex: requireList.length,
        count: externalList.length,
      });
      const items = requireList.concat(externalList);

      setGroup(groups);
      setListItem(items);

      setPage(PageTypes.ReviewResource);
      setTitle(DialogTitle.REVIEW);
    },
    [extensionResourceOptions]
  );

  const onSubmit = useMemo(
    () => async (options) => {
      console.log(options);
      // call back to the main Composer API to begin this process...
      startProvision(options);
      // TODO: close window
      closeDialog();
    },
    []
  );

  const onSave = useMemo(
    () => () => {
      savePublishConfig(importConfig);
      closeDialog();
    },
    [importConfig]
  );

  const updateChoice = useMemo(
    () => (ev, option) => {
      setChoice(option);
    },
    []
  );

  const isDisAble = useMemo(() => {
    return !currentSubscription || !currentHostName || errorHostName !== '';
  }, [currentSubscription, currentHostName, errorHostName]);

  const PageFormConfig = (
    <Fragment>
      <ChoiceGroup defaultSelectedKey="create" options={choiceOptions} onChange={updateChoice} />
      {subscriptionOption?.length > 0 && choice.key === 'create' && (
        <form style={{ width: '60%', height:'100%' }}>
          <Dropdown
            required
            defaultSelectedKey={currentSubscription?.subscriptionId}
            label={'Subscription'}
            options={subscriptionOption}
            placeholder={'Select your subscription'}
            onChange={updateCurrentSubscription}
          />
          <TextField
            required
            defaultValue={currentHostName}
            errorMessage={errorHostName}
            label={'HostName'}
            placeholder={'Name of your new resource group'}
            onChange={newResourceGroup}
          />
          <Dropdown
            required
            defaultSelectedKey={currentLocation?.id}
            label={'Locations'}
            options={deployLocationsOption}
            placeholder={'Select your location'}
            onChange={updateCurrentLocation}
          />
          {currentLocation && luisLocations.length>0 && !luisLocations.includes(currentLocation.name) ?
          <Dropdown
            required
            label={'Location for Luis'}
            options={luisLocationsOption}
            placeholder={'Select your location'}
            onChange={updateLuisLocation}
          />: null}
        </form>
      )}
      {choice.key === 'create' && subscriptionOption?.length < 1 && <Spinner label="Loading" />}
      {choice.key === 'import' && (
        <div style={{ width: '60%', marginTop: '10px', height: '100%' }}>
          <div>Publish Configuration</div>
          <JsonEditor
            id={publishType}
            height={200}
            value={importConfig}
            onChange={(value) => {
              setEditorError(false);
              setImportConfig(value);
            }}
            schema={getSchema()}
            onError={() => {
              setEditorError(true);
            }}
          />
        </div>
      )}
    </Fragment>
  );

  const selection = useMemo(() => {
     const s =  new Selection({
      onSelectionChanged: () => {
        const list = s.getSelection();
        setEnabledResources(list);
      },
      canSelectItem: (item, index) => {
        return item.required === false;
      },
    });
    if(s && listItems){
      s.setItems(listItems,false);
      s.setAllSelected(true);
    }
    return s;
  }, [listItems]);

  const PageReview = useMemo(() => {
    return (
      <Fragment>
        <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto} style={{height: 'calc(100vh - 50px)'}}>
        <DetailsList
          isHeaderVisible
          checkboxVisibility={CheckboxVisibility.onHover}
          selectionMode={SelectionMode.multiple}
          selection={selection}
          columns={columns}
          getKey={(item) => item.key}
          groups={group}
          items={listItems}
          layoutMode={DetailsListLayoutMode.justified}
          setKey="none"
          onRenderDetailsHeader={onRenderDetailsHeader}
        />
        </ScrollablePane>
      </Fragment>
    );
  }, [group, listItems, selection]);

  const PageFooter = useMemo(() => {
    if (page === PageTypes.ConfigProvision) {
      return (
        <div style={{display: 'flex', flexFlow: 'row nowrap', justifyContent: 'space-between'}}>
          {currentUser? <Persona size={PersonaSize.size32} text={currentUser.name} />: null}
          <div>
            <DefaultButton text={'Back'} onClick={onBack} style={{margin: '0 4px'}} />
            {choice.key === 'create' ? (
              <PrimaryButton
                disabled={isDisAble}
                text="Next"
                onClick={() => {
                  onNext(currentHostName);
                }}
                style={{margin: '0 4px'}}
              />
            ) : (
              <PrimaryButton disabled={isEditorError} text="Save" onClick={onSave} style={{margin: '0 4px'}} />
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{display: 'flex', flexFlow: 'row nowrap', justifyContent: 'space-between'}}>
          {currentUser? <Persona size={PersonaSize.size32} text={currentUser.name} />: null}
          <div>
            <DefaultButton
              text={'Back'}
              onClick={() => {
                setPage(PageTypes.ConfigProvision);
                setTitle(DialogTitle.CONFIG_RESOURCES);
              }}
              style={{margin: '0 4px'}}
            />
            <PrimaryButton
              disabled={isDisAble}
              text={'Done'}
              onClick={async () => {
                const selectedResources = enabledResources.concat(requireResources);
                await onSubmit({
                  subscription: currentSubscription,
                  hostname: currentHostName,
                  location: currentLocation,
                  luisLocation: currentLuisLocation || currentLocation.name,
                  type: publishType,
                  externalResources: selectedResources,
                });
              }}
              style={{margin: '0 4px'}}
            />
          </div>
        </div>
      );
    }
  }, [
    onSave,
    page,
    choice,
    isEditorError,
    isDisAble,
    currentSubscription,
    currentHostName,
    currentLocation,
    publishType,
    extensionResourceOptions,
    currentUser,
    enabledResources,
    requireResources,
    currentLuisLocation
  ]);

  return (
    <div style={{ height: '100vh' }}>
        {page === PageTypes.ConfigProvision ? PageFormConfig : PageReview}
      <div
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #000',
          position: 'fixed',
          width: '100%',
          bottom: '0',
          textAlign: 'right',
          height:'fit-content',
          padding: '16px 0px 0px',
        }}
      >
        {PageFooter}
      </div>
    </div>
  );
};