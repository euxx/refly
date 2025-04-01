import { useRef, memo, useState, useCallback, useEffect } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Button } from 'antd';
import { useEditor, EditorContent } from '@tiptap/react';
import { Markdown } from 'tiptap-markdown';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { useThrottledCallback } from 'use-debounce';
import { EditorInstance } from '@refly-packages/ai-workspace-common/components/editor/core/components';
import classNames from 'classnames';
import { MemoEditor } from '@refly-packages/ai-workspace-common/components/canvas/nodes/memo/memo-editor';
import { useMindMapHoverEffect } from '../hooks/use-mind-map-hover';
import './custom-node.scss';

interface NodeColors {
  bg: string;
  border: string;
}

// Custom node component with hover menu and edit functionality
export const CustomNode = memo(({ id, data }: NodeProps) => {
  // Safe type assertion with runtime checks
  const nodeData = data as any;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bgColor, setBgColor] = useState((nodeData?.colors?.bg || '#FFFFFF') as string);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Use the hover effect hook for ReactFlow state updates
  const { handleMouseEnter, handleMouseLeave } = useMindMapHoverEffect(id);

  // Parent component hover handler
  const onHover = nodeData?.onHover;

  // State for node dimensions
  const [dimensions, setDimensions] = useState({
    width: nodeData?.dimensions?.width || 200,
    height: nodeData?.dimensions?.height || 40,
  });

  // Make sure we have valid node data
  if (!nodeData || typeof nodeData !== 'object') {
    return <div className="p-2 text-red-500">Missing node data</div>;
  }

  // Ensure required properties exist
  const label = typeof nodeData.label === 'string' ? nodeData.label : 'Untitled';
  const hasChildren = nodeData?.hasChildren;
  const colors: NodeColors = nodeData?.colors || {
    bg: 'rgb(255, 255, 255)',
    border: 'rgb(203, 213, 225)',
  };
  const level = nodeData?.level || 0;

  // Handle editor dimensions when editing state changes
  useEffect(() => {
    if (isEditing) {
      // Expand to editing size
      setDimensions({
        width: Math.max(dimensions.width, 300),
        height: Math.max(dimensions.height, 100),
      });
    } else {
      // Return to default compact size when not editing
      setDimensions({
        width: nodeData?.dimensions?.width || 200,
        height: nodeData?.dimensions?.height || 40,
      });
    }
  }, [isEditing]);

  // Save dimensions to node data when they change
  const saveDimensions = useCallback(() => {
    if (typeof nodeData.onDimensionsChange === 'function') {
      nodeData.onDimensionsChange(id, dimensions);
    }
  }, [id, dimensions, nodeData]);

  useEffect(() => {
    saveDimensions();
  }, [dimensions, saveDimensions]);

  // Setup rich text editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        validate: (href) => /^(https?:\/\/|mailto:|tel:)/.test(href),
      }),
      Markdown.configure({
        html: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Enter your content here...',
      }),
    ],
    content: nodeData?.content || label,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      onContentUpdate(editor);
    },
    onBlur: () => {
      setIsEditing(false);
    },
    editorProps: {
      attributes: {
        class: classNames('max-w-none', 'focus:outline-none', 'min-h-[30px]', 'w-full', 'h-full'),
      },
    },
  });

  const onContentUpdate = useThrottledCallback((editor: EditorInstance) => {
    const markdown = editor.storage.markdown.getMarkdown();
    const jsonContent = editor.getJSON();

    if (typeof nodeData.onContentChange === 'function') {
      nodeData.onContentChange(id, markdown, jsonContent);
    }
  }, 200);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    editor?.setEditable(true);
    setTimeout(() => {
      editor?.commands.focus();
    }, 0);
  }, [editor]);

  const handleBgColorChange = useCallback(
    (color: string) => {
      setBgColor(color);
      if (typeof nodeData.onColorChange === 'function') {
        nodeData.onColorChange(id, { bg: color, border: colors.border });
      }
    },
    [id, colors.border, nodeData],
  );

  // Combined hover handler
  const onMouseEnter = useCallback(() => {
    setIsHovered(true);
    handleMouseEnter();
    if (typeof onHover === 'function') {
      onHover(id);
    }
  }, [handleMouseEnter, onHover, id]);

  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
    handleMouseLeave();
    if (typeof onHover === 'function') {
      onHover(null);
    }
  }, [handleMouseLeave, onHover]);

  // Determine if this is the root node
  const isRoot = id === 'root' || nodeData.isRoot;

  // Determine the color for the toggle button
  const buttonColor = nodeData.isExpanded
    ? colors.border
    : nodeData.childCount > 0
      ? '#f97316'
      : colors.border; // Orange color for nodes with children when collapsed

  return (
    <>
      <div
        ref={nodeRef}
        className={`rounded-lg border shadow-sm transition-all ${isHovered ? 'shadow-md' : ''}`}
        style={{
          borderColor: colors.border,
          backgroundColor: bgColor,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          minHeight: '40px',
          minWidth: '200px',
          maxWidth: isEditing ? '400px' : '220px',
          transform: `scale(${isHovered ? 1.02 : 1})`,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex flex-col h-full w-full p-3">
          <div
            className="w-full h-full overflow-auto"
            style={{
              color: isRoot
                ? 'rgb(30 64 175)'
                : `rgb(${55 + level * 10}, ${65 + level * 10}, ${75 + level * 10})`,
              cursor: isEditing ? 'text' : 'pointer',
            }}
          >
            {editor && (
              <EditorContent
                editor={editor}
                className={classNames(
                  'text-xs rich-text-editor memo-node-editor',
                  'h-full',
                  'w-full',
                )}
              />
            )}
          </div>
        </div>

        {/* Editor menu bar - show when editing or hovering */}
        {(isEditing || isHovered) && editor && (
          <MemoEditor editor={editor} bgColor={bgColor} onChangeBackground={handleBgColorChange} />
        )}

        {isHovered && !isEditing && (
          <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 space-x-1 rounded-md bg-white p-1 shadow-md z-10">
            <Button
              size="small"
              className="h-7 text-xs hover:!border-[#00968F] hover:!text-[#00968F]"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof nodeData.onAddChild === 'function') {
                  nodeData.onAddChild(id);
                }
              }}
            >
              + Child
            </Button>
            {!isRoot && (
              <Button
                size="small"
                className="h-7 text-xs hover:!border-[#00968F] hover:!text-[#00968F]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof nodeData.onAddSibling === 'function') {
                    nodeData.onAddSibling(id);
                  }
                }}
              >
                + Sibling
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expand/Collapse button positioned outside the node */}
      {hasChildren && (
        <div
          className="absolute z-20"
          style={{
            top: '50%',
            right: '-28px',
            transform: 'translateY(-50%)',
          }}
        >
          <Button
            type="text"
            size="small"
            className="flex items-center justify-center rounded-full shadow-sm"
            style={{
              width: '20px',
              height: '20px',
              minWidth: '20px',
              padding: '0',
              backgroundColor: 'white',
              color: buttonColor,
              border: `1px solid ${buttonColor}30`,
              fontSize: '12px',
              lineHeight: '18px',
              fontWeight: 'bold',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (typeof nodeData.onToggleExpand === 'function') {
                nodeData.onToggleExpand(id);
              }
            }}
            title={nodeData.isExpanded ? 'Collapse' : `Expand (${nodeData.childCount || 0} items)`}
          >
            {nodeData.isExpanded ? (
              <span>−</span>
            ) : (
              <span>+{nodeData.childCount > 0 ? nodeData.childCount : ''}</span>
            )}
          </Button>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source`}
        style={{ backgroundColor: colors.border }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target`}
        style={{ backgroundColor: colors.border }}
        className="w-2 h-2"
      />
    </>
  );
});
