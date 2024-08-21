import { getAuthTokenFromCookie } from './request';
import { getServerOrigin } from '@refly/utils/url';
import { InvokeSkillRequest } from '@refly/openapi-schema';
import { SkillEvent } from '@refly/common-types';
import { getRuntime } from '@refly-packages/ai-workspace-common/utils/env';
import { getCookie } from '@refly-packages/ai-workspace-common/utils/cookie';

export const ssePost = async ({
  controller,
  token,
  payload,
  onStart,
  onSkillThoughout,
  onSkillStart,
  onSkillStream,
  onSkillEnd,
  onSkillStructedData,
  onError,
  onCompleted,
}: {
  controller: AbortController;
  token: string;
  payload: InvokeSkillRequest;
  onStart: () => void;
  onSkillThoughout: (event: SkillEvent) => void;
  onSkillStart: (event: SkillEvent) => void;
  onSkillStream: (event: SkillEvent) => void;
  onSkillEnd: (event: SkillEvent) => void;
  onSkillStructedData: (event: SkillEvent) => void;
  onError?: (status: any) => void;
  onCompleted?: (val?: boolean) => void;
}) => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const response = await fetch(`${getServerOrigin()}/v1/skill/streamInvoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      onError?.(errorText || `HTTP error! status: ${response.status}`);
      return;
    }

    reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let isSkillFirstMessage = true;
    let bufferStr = '';

    const read = async () => {
      let hasError = false;
      try {
        const { done, value } = await reader?.read();

        if (done) {
          onCompleted?.();

          return;
        }

        bufferStr += decoder.decode(value, { stream: true });
        const lines = bufferStr.split('\n');
        let skillEvent: SkillEvent;

        try {
          lines?.forEach((message) => {
            if (message.startsWith('data: ')) {
              try {
                skillEvent = JSON.parse(message.substring(6)) as SkillEvent;
              } catch (err) {
                console.log('ssePost 消息解析错误，静默失败：', err); // 这里只是解析错误，可以静默失败
                return;
              }

              // TODO 后续增加 skillEvent 可以处理错误的情况

              if (skillEvent?.event === 'start') {
                if (isSkillFirstMessage) {
                  onSkillStart(skillEvent);
                }
              } else if (skillEvent?.event === 'log') {
                onSkillThoughout(skillEvent);
              } else if (skillEvent?.event === 'end') {
                onSkillEnd(skillEvent);
                isSkillFirstMessage = true;
              } else if (skillEvent?.event === 'stream') {
                onSkillStream(skillEvent);
              } else if (skillEvent?.event === 'structured_data') {
                onSkillStructedData(skillEvent);
              }
            }
          });

          bufferStr = lines[lines.length - 1];
        } catch (err) {
          onError(err);
          onCompleted?.(true);
          hasError = true;

          return;
        }

        if (!hasError) {
          await read();
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Read operation aborted');
          onError?.('Request was aborted');
          hasError = true;
          return;
        }
      }
    };

    await read();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted');
      onError?.('Request was aborted');
    } else {
      console.error('Fetch error:', error);
      onError?.(error.message);
    }
  } finally {
    // 清理资源
    if (reader) {
      try {
        await reader.cancel();
      } catch (cancelError) {
        console.error('Error cancelling reader:', cancelError);
      }
      reader.releaseLock();
    }
  }
};
