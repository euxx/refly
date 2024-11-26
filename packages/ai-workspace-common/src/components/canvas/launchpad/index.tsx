import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { notification } from 'antd';

import { ChatInput } from './chat-input';
import { SkillDisplay } from './skill-display';
import { ChatHistory } from './chat-history';

// stores
import { useSkillStoreShallow } from '@refly-packages/ai-workspace-common/stores/skill';
import { useContextPanelStore } from '@refly-packages/ai-workspace-common/stores/context-panel';
import {
  useChatStore,
  MessageIntentContext,
  useChatStoreShallow,
} from '@refly-packages/ai-workspace-common/stores/chat';
import { useUserStore } from '@refly-packages/ai-workspace-common/stores/user';

// types
import { editorEmitter, InPlaceSendMessagePayload } from '@refly-packages/utils/event-emitter/editor';
import { LOCALE } from '@refly/common-types';
import { useCanvasContext } from '@refly-packages/ai-workspace-common/context/canvas';
import { useInvokeAction } from '@refly-packages/ai-workspace-common/hooks/use-invoke-action';
import { useContextFilterErrorTip } from './context-manager/hooks/use-context-filter-errror-tip';
import { InvokeSkillRequest } from '@refly/openapi-schema';
import { genActionResultID } from '@refly-packages/utils/id';

export const LaunchPad = () => {
  const { t } = useTranslation();

  // stores
  const skillStore = useSkillStoreShallow((state) => ({
    selectedSkill: state.selectedSkill,
  }));
  const chatStore = useChatStoreShallow((state) => ({
    setNewQAText: state.setNewQAText,
    setMessageIntentContext: state.setMessageIntentContext,
  }));

  // hooks
  const { handleFilterErrorTip } = useContextFilterErrorTip();
  const { invokeAction, abortAction } = useInvokeAction();
  const { canvasId } = useCanvasContext();

  const handleSendMessage = (userInput?: string) => {
    const error = handleFilterErrorTip();
    if (error) {
      return;
    }

    const { formErrors } = useContextPanelStore.getState();
    if (formErrors && Object.keys(formErrors).length > 0) {
      notification.error({
        message: t('copilot.configManager.errorTipTitle'),
        description: t('copilot.configManager.errorTip'),
      });
      return;
    }

    const { localSettings } = useUserStore.getState();
    const { newQAText, selectedModel } = useChatStore.getState();
    const { selectedContextItems, selectedResultItems } = useContextPanelStore.getState();

    const resultId = genActionResultID();
    const param: InvokeSkillRequest = {
      canvasId,
      resultId,
      input: {
        query: userInput || newQAText.trim(),
      },
      modelName: selectedModel?.name,
      context: {
        resources: selectedContextItems
          .filter((item) => item.type === 'resource')
          .map((item) => ({
            resourceId: item.data?.entityId || item.id,
            isCurrent: item.isCurrentContext,
            metadata: item.data?.metadata,
          })),
        documents: selectedContextItems
          .filter((item) => item.type === 'document')
          .map((item) => ({
            documentId: item.data?.entityId || item.id,
            isCurrent: item.isCurrentContext,
            metadata: item.data?.metadata,
          })),
      },
      resultHistory: selectedResultItems.map((item) => ({
        resultId: item.resultId,
      })),
      skillName: skillStore.selectedSkill?.name || 'common_qna',
      locale: localSettings?.outputLocale,
      tplConfig: {}, // TODO: add tplConfig
    };

    chatStore.setNewQAText('');

    invokeAction(param);
  };

  const handleAbort = () => {
    abortAction();
  };

  const handleInPlaceEditSendMessage = (data: InPlaceSendMessagePayload) => {
    const { canvasEditConfig, userInput, inPlaceActionType } = data;
    const { localSettings } = useUserStore.getState();
    const locale = localSettings?.uiLocale || LOCALE.EN;

    const { messageIntentContext } = useChatStore.getState();
    let newUserInput = userInput;

    // TODO: temp handle in frontend: 1) edit need set canvasEditConfig 2) chat for normal chat
    const isEditAction = inPlaceActionType === 'edit';
    let newMessageIntentContext: Partial<MessageIntentContext> = {
      ...(messageIntentContext || {}),
      inPlaceActionType,
    };

    if (isEditAction) {
      newMessageIntentContext = {
        ...(newMessageIntentContext || {}),
        canvasEditConfig,
      };
    } else {
      const { selection } = canvasEditConfig || {};
      const selectedText = selection?.highlightedText || '';

      if (selectedText) {
        newUserInput =
          `> ${locale === LOCALE.EN ? '**User Selected Text:** ' : '**用户选中的文本:** '} ${selectedText}` +
          `\n\n` +
          `${locale === LOCALE.EN ? '**Please answer question based on the user selected text:** ' : '**请根据用户选中的文本回答问题:** '} ${userInput}`;
      }
    }

    chatStore.setMessageIntentContext(newMessageIntentContext as MessageIntentContext);
    handleSendMessage(newUserInput);
  };

  useEffect(() => {
    editorEmitter.on('inPlaceSendMessage', handleInPlaceEditSendMessage);

    return () => {
      editorEmitter.off('inPlaceSendMessage', handleInPlaceEditSendMessage);
    };
  }, []);

  return (
    <>
      <div className="ai-copilot-operation-container">
        <div className="ai-copilot-operation-body">
          <SkillDisplay />
          <ChatHistory />
          <ChatInput handleSendMessage={handleSendMessage} handleAbort={handleAbort} />
        </div>
      </div>
    </>
  );
};
