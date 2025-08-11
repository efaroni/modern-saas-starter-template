export default function UnsubscribePage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
            Invalid Unsubscribe Link
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            This old-format unsubscribe link is no longer supported.
          </p>
          <p className='mt-4 text-sm text-gray-600'>
            Modern unsubscribe links are included in each email we send you and
            will work automatically when clicked.
          </p>

          <div className='mt-8'>
            <a
              href='/settings/email'
              className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
            >
              Manage Email Preferences
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
