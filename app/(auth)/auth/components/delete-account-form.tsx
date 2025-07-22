'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';
// import { deleteAccountAction } from '@/app/actions/auth' // TODO: Implement when ready

const deleteAccountSchema = z.object({
  confirmText: z.string().refine((val) => val === 'DELETE', {
    message: 'Please type "DELETE" to confirm',
  }),
});

type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>

interface DeleteAccountFormProps {
  user: AuthUser
  onSuccess: () => void
  onError: (error: string) => void
}

export function DeleteAccountForm({ user: _user, onSuccess: _onSuccess, onError }: DeleteAccountFormProps) {
  const [isSubmitting, _setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteAccountFormData>({
    resolver: zodResolver(deleteAccountSchema),
  });

  const onSubmit = () => {
    // TODO: Implement account deletion with server action
    onError('Account deletion not yet implemented');
  };

  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };

  const handleCancelClick = () => {
    setShowConfirmation(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>

        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-red-800">Delete Account</h4>
              <p className="text-sm text-red-700 mt-1">
                Once you delete your account, there is no going back. This action cannot be undone.
              </p>
            </div>

            {!showConfirmation ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm"
              >
                Delete Account
              </button>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="confirm-delete" className="block text-sm font-medium text-red-700">
                    Type &quot;DELETE&quot; to confirm account deletion
                  </label>
                  <Input
                    {...register('confirmText')}
                    type="text"
                    id="confirm-delete"
                    variant={errors.confirmText ? 'error' : 'default'}
                    className="mt-1 block w-full"
                    placeholder="DELETE"
                  />
                  {errors.confirmText && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmText.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {isSubmitting && <Spinner size="sm" />}
                    {isSubmitting ? 'Deleting...' : 'Delete Account'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}