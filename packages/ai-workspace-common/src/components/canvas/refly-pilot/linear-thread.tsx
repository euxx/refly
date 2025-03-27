import { memo, useRef } from 'react';
import { SkillResponseNodePreview } from '@refly-packages/ai-workspace-common/components/canvas/node-preview/skill-response';

export interface LinearThreadMessage {
  id: string;
  resultId: string;
  nodeId: string;
  timestamp: number;
}

interface LinearThreadContentProps {
  messages: LinearThreadMessage[];
  contentHeight: string | number;
  className?: string;
}

// Optimize SkillResponseNodePreview with memo
const MemoizedSkillResponseNodePreview = memo(SkillResponseNodePreview, (prevProps, nextProps) => {
  return (
    prevProps.resultId === nextProps.resultId &&
    prevProps.node.data?.entityId === nextProps.node.data?.entityId
  );
});

MemoizedSkillResponseNodePreview.displayName = 'MemoizedSkillResponseNodePreview';

export const LinearThreadContent = memo(
  ({ messages, contentHeight, className = '' }: LinearThreadContentProps) => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    return (
      <div
        ref={messagesContainerRef}
        className={`flex-grow overflow-auto preview-container ${className}`}
        style={{ height: contentHeight, width: '100%' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {messages.map((message) => (
              <div key={message.id}>
                <MemoizedSkillResponseNodePreview
                  node={{
                    id: message.nodeId,
                    type: 'skillResponse',
                    position: { x: 0, y: 0 },
                    data: {
                      entityId: message.resultId,
                      title: 'Refly Pilot Response',
                      metadata: {
                        status: 'finish',
                      },
                    },
                  }}
                  resultId={message.resultId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

LinearThreadContent.displayName = 'LinearThreadContent';
