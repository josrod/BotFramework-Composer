// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx, css } from '@emotion/core';
import React from 'react';
import { FontWeights, FontSizes } from 'office-ui-fabric-react/lib/Styling';
import { useRecoilValue } from 'recoil';

import { LeftRightSplit } from '../components/Split/LeftRightSplit';
import { navigateTo, buildURL } from '../utils/navigation';
import { currentModeState } from '../recoilModel';

import { Toolbar, IToolbarItem } from './Toolbar';
import { NavTree, INavTreeItem } from './NavTree';
import { ProjectTree } from './ProjectTree/ProjectTree';

// -------------------- Styles -------------------- //

export const root = css`
  height: calc(100vh - 50px);
  display: flex;
  flex-direction: row;

  label: Page;
`;

export const pageWrapper = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  label: PageWrapper;
`;

export const header = css`
  padding: 5px 20px;
  height: 60px;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;

  label: PageHeader;
`;

export const headerTitle = css`
  font-size: ${FontSizes.xLarge};
  font-weight: ${FontWeights.semibold};

  label: PageHeaderTitle;
`;

export const headerContent = css`
  display: flex;
  align-items: center;

  label: PageHeaderContent;
`;

export const main = css`
  margin-left: 2px;
  height: calc(100vh - 165px);
  display: flex;
  border-top: 1px solid #dddddd;
  position: relative;
  nav {
    ul {
      margin-top: 0px;
    }
  }

  label: PageMain;
`;

export const content = css`
  flex: 4;
  padding: 20px;
  position: relative;
  overflow: auto;
  height: calc(100% - 40px);
  label: PageContent;
`;

// -------------------- Page -------------------- //

type IPageProps = {
  toolbarItems: IToolbarItem[];
  title: string;
  navRegionName: string;
  mainRegionName: string;
  onRenderHeaderContent?: () => string | JSX.Element | null;
  'data-testid'?: string;
  useNewTree: boolean;
  navLinks?: INavTreeItem[];
};

const Page: React.FC<IPageProps> = (props) => {
  const {
    title,
    navLinks,
    toolbarItems,
    onRenderHeaderContent,
    children,
    navRegionName,
    mainRegionName,
    useNewTree,
  } = props;

  const pageMode = useRecoilValue(currentModeState);

  return (
    <div css={root} data-testid={props['data-testid']}>
      <div css={pageWrapper}>
        <Toolbar toolbarItems={toolbarItems} />
        <div css={header}>
          <h1 css={headerTitle}>{title}</h1>
          {onRenderHeaderContent && <div css={headerContent}>{onRenderHeaderContent()}</div>}
        </div>
        <div css={main} role="main">
          <LeftRightSplit initialLeftGridWidth="20%" minLeftPixels={200} minRightPixels={800}>
            {useNewTree ? (
              <ProjectTree
                showDelete={false}
                showTriggers={false}
                onSelect={(link) => {
                  console.log(link);
                  navigateTo(buildURL(pageMode, link));
                }}
                onSelectAllLink={() => {
                  console.log('all');
                }}
              />
            ) : (
              <NavTree navLinks={navLinks as INavTreeItem[]} regionName={navRegionName} />
            )}
            <div aria-label={mainRegionName} css={content} data-testid="PageContent" role="region">
              {children}
            </div>
          </LeftRightSplit>
        </div>
      </div>
    </div>
  );
};

export { Page };
