'use client'

import { Comment } from '@/lib/types/models'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CommentForm from './CommentForm'

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[]
  user?: { email: string }
}

interface CommentListProps {
  comments: CommentWithReplies[]
  modelId: string
}

export default function CommentList({ comments: initialComments, modelId }: CommentListProps) {
  const [comments, setComments] = useState(initialComments)
  const [user, setUser] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setUser(user))
  }, [])

  const deleteComment = async (commentId: string) => {
    if (!confirm('Weet je zeker dat je deze commentaar wilt verwijderen?')) return

    const { error } = await createClient()
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      setComments(comments.filter((c) => c.id !== commentId))
    }
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: CommentWithReplies; depth?: number }) => {
    const isOwner = user && user.id === comment.user_id

    return (
      <div className={`${depth > 0 ? 'ml-8 mt-2' : ''} p-3 bg-white rounded-lg border border-gray-200`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-medium text-sm">
              {comment.user?.email || 'Anonieme gebruiker'}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => deleteComment(comment.id)}
              className="text-red-600 hover:text-red-700 text-xs"
            >
              Verwijder
            </button>
          )}
        </div>
        <p className="text-gray-700 whitespace-pre-wrap mb-2">{comment.content}</p>
        {user && depth < 2 && (
          <button
            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {replyingTo === comment.id ? 'Annuleren' : 'Antwoorden'}
          </button>
        )}
        {replyingTo === comment.id && (
          <div className="mt-2">
            <CommentForm
              modelId={modelId}
              parentId={comment.id}
              onCancel={() => setReplyingTo(null)}
            />
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nog geen commentaren. Wees de eerste!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}

