import Root from './root.tsx';
import ErrorPage from '../error-page.tsx';
import Contact from './contact';

export default [
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: '', element: <div>Home</div> },
      // { path: 'haha', element: <div>Home haha</div> },
      { path: 'contacts/:contactId', element: <Contact /> },
    ],
  },
  {
    path: '/haha',
    element: <div>haha</div>,
  },
];
