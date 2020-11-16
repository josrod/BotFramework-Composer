// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx, css } from '@emotion/core';
import React, { useEffect, Suspense } from 'react';
import { Router, Redirect, RouteComponentProps } from '@reach/router';
import { useRecoilValue } from 'recoil';
import formatMessage from 'format-message';

import { resolveToBasePath } from './utils/fileUtil';
import { data } from './styles';
import { NotFound } from './components/NotFound';
import { BASEPATH } from './constants';
import {
  dispatcherState,
  schemasState,
  botProjectIdsState,
  botOpeningState,
  pluginPagesSelector,
  botProjectSpaceSelector,
} from './recoilModel';
import { rootBotProjectIdSelector } from './recoilModel/selectors/project';
import { openAlertModal } from './components/Modal/AlertDialog';
import { dialogStyle } from './components/Modal/dialogStyle';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PluginPageContainer } from './pages/plugin/PluginPageContainer';
import { botProjectSpaceLoadedState } from './recoilModel/atoms';
import { mergePropertiesManagedByRootBot } from './recoilModel/dispatchers/utils/project';

const DesignPage = React.lazy(() => import('./pages/design/DesignPage'));
const LUPage = React.lazy(() => import('./pages/language-understanding/LUPage'));
const QnAPage = React.lazy(() => import('./pages/knowledge-base/QnAPage'));
const LGPage = React.lazy(() => import('./pages/language-generation/LGPage'));
const SettingPage = React.lazy(() => import('./pages/setting/SettingsPage'));
const BotProjectSettings = React.lazy(() => import('./pages/botProject/BotProjectSettings'));
const Diagnostics = React.lazy(() => import('./pages/diagnostics/Diagnostics'));
const Publish = React.lazy(() => import('./pages/publish/Publish'));
const BotCreationFlowRouter = React.lazy(() => import('./components/CreationFlow/CreationFlow'));
const FormDialogPage = React.lazy(() => import('./pages/form-dialog/FormDialogPage'));

const Routes = (props) => {
  const botOpening = useRecoilValue(botOpeningState);
  const pluginPages = useRecoilValue(pluginPagesSelector);

  return (
    <div css={data}>
      <Suspense fallback={<LoadingSpinner />}>
        <Router basepath={BASEPATH} {...props}>
          <Redirect
            noThrow
            from="/bot/:projectId/language-generation"
            to="/bot/:projectId/language-generation/common"
          />
          <Redirect
            noThrow
            from="/bot/:projectId/language-understanding"
            to="/bot/:projectId/language-understanding/all"
          />
          <Redirect noThrow from="/bot/:projectId/knowledge-base" to="/bot/:projectId/knowledge-base/all" />
          <Redirect noThrow from="/bot/:projectId/publish" to="/bot/:projectId/publish/all" />
          <Redirect noThrow from="/bot/:projectId/botProjectsSettings" to="/bot/:projectId/botProjectsSettings/root" />
          <Redirect noThrow from="/" to={resolveToBasePath(BASEPATH, 'home')} />
          <ProjectRouter path="/bot/:projectId">
            <DesignPage path="dialogs/:dialogId/*" />
            <LUPage path="language-understanding/:dialogId/*" />
            <LGPage path="language-generation/:dialogId/*" />
            <QnAPage path="knowledge-base/:dialogId/*" />
            <Publish path="publish/:targetName" />
            <BotProjectSettings path="botProjectsSettings/*" />
            <FormDialogPage path="forms/:schemaId/*" />
            <FormDialogPage path="forms/*" />
            <DesignPage path="*" />
            <Diagnostics path="diagnostics" />
            {pluginPages.map((page) => (
              <PluginPageContainer
                key={`${page.id}/${page.bundleId}`}
                bundleId={page.bundleId}
                path={`plugin/${page.id}/${page.bundleId}`}
                pluginId={page.id}
              />
            ))}
          </ProjectRouter>
          <ProjectRouter path="/bot/:projectId/skill/:skillId">
            <DesignPage path="dialogs/:dialogId/*" />
            <LUPage path="language-understanding/:dialogId/*" />
            <LGPage path="language-generation/:dialogId/*" />
            <QnAPage path="knowledge-base/:dialogId/*" />
            <Diagnostics path="diagnostics" />
            <DesignPage path="*" />
          </ProjectRouter>
          <SettingPage path="settings/*" />
          <BotCreationFlowRouter path="projects/*" />
          <BotCreationFlowRouter path="home" />
          <NotFound default />
        </Router>
      </Suspense>
      {botOpening && (
        <div
          css={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};

const projectStyle = css`
  height: 100%;

  & > div {
    height: 100%;
  }

  label: ProjectRouter;
`;

const ProjectRouter: React.FC<RouteComponentProps<{ projectId: string; skillId: string }>> = (props) => {
  const { projectId = '' } = props;
  const schemas = useRecoilValue(schemasState(projectId));
  const { fetchProjectById, setSettings } = useRecoilValue(dispatcherState);
  const botProjects = useRecoilValue(botProjectIdsState);
  const botProjectsMetaData = useRecoilValue(botProjectSpaceSelector);
  const botProjectSpaceLoaded = useRecoilValue(botProjectSpaceLoadedState);
  const rootBotProjectId = useRecoilValue(rootBotProjectIdSelector);

  useEffect(() => {
    if (botProjectSpaceLoaded && rootBotProjectId && botProjectsMetaData) {
      for (let i = 0; i < botProjectsMetaData.length; i++) {
        if (!botProjectsMetaData[i].isRemote) {
          const id = botProjectsMetaData[i].projectId;
          const setting = botProjectsMetaData[i].setting;
          const mergedSettings = mergePropertiesManagedByRootBot(id, rootBotProjectId, setting);
          setSettings(id, mergedSettings);
        }
      }
    }
  }, [botProjectSpaceLoaded, rootBotProjectId]);

  useEffect(() => {
    if (props.projectId && !botProjects.includes(props.projectId)) {
      fetchProjectById(props.projectId);
    }
  }, [props.projectId]);

  useEffect(() => {
    const schemaError = schemas?.diagnostics ?? [];
    if (schemaError.length !== 0) {
      const title = formatMessage('Error Processing Schema');
      const subTitle = schemaError.join('\n');
      openAlertModal(title, subTitle, { style: dialogStyle.console });
    }
  }, [schemas, projectId]);

  if (props.projectId && botProjects.includes(props.projectId)) {
    if (props.skillId && !botProjects.includes(props.skillId)) {
      return <LoadingSpinner />;
    } else {
      return <div css={projectStyle}>{props.children}</div>;
    }
  }
  return <LoadingSpinner />;
};

export default Routes;
