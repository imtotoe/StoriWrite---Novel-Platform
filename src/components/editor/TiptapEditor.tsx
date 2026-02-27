"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import { EditorToolbar } from "./EditorToolbar";
import type { JSONContent } from "@tiptap/react";

interface TiptapEditorProps {
  content?: JSONContent;
  onChange?: (json: JSONContent) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onChange, placeholder = "เริ่มเขียนเนื้อหา..." }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[400px] px-4 py-3 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div className="rounded-md border">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex justify-end gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
        <span>{words.toLocaleString()} คำ</span>
        <span>{chars.toLocaleString()} ตัวอักษร</span>
      </div>
    </div>
  );
}
