"use client";
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RichText({ value, onChange, id }: { value: string; onChange: (html: string) => void; id?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } })],
    content: value,
    editorProps: {
      attributes: { id: id ?? "", class: "prose-admin min-h-[180px] px-4 py-3 text-sm text-charcoal outline-none dark:text-white", "aria-label": "Description" },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Keep in sync when the form is reset/restored from a draft
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(editor.isEmpty && !value)) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div className="h-[230px] rounded-xl border border-silver/70 dark:border-white/15" />;

  const Btn = ({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: React.ReactNode }) => (
    <button type="button" onClick={on} aria-label={label} title={label} aria-pressed={active} className={cn("grid h-8 w-8 place-items-center rounded-lg transition hover:bg-mist dark:hover:bg-white/10", active && "bg-charcoal text-white hover:bg-charcoal dark:bg-white dark:text-charcoal")}>
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-silver/70 focus-within:border-brand dark:border-white/15">
      <div className="flex flex-wrap gap-0.5 border-b border-silver/50 bg-mist/60 p-1.5 dark:border-white/10 dark:bg-white/5">
        <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
        <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
        <Btn label="Heading" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
        <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn
          label="Link"
          active={editor.isActive("link")}
          on={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Btn>
        <span className="mx-1 w-px bg-silver/60 dark:bg-white/15" />
        <Btn label="Undo" on={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
        <Btn label="Redo" on={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
