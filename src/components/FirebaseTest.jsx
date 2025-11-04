import { useEffect, useState } from 'react';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase/config';

function FirebaseTest() {
  const [attorneys, setAttorneys] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({
    attorneysFound: 0,
    entriesFound: 0,
    sampleAttorney: null,
    sampleEntry: null,
  });

  useEffect(() => {
    const runTests = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Starting Firebase connection tests...');

        // Test 1: Fetch all attorneys
        console.log('Test 1: Fetching attorneys collection...');
        const attorneysSnapshot = await getDocs(collection(db, 'attorneys'));
        const attorneyList = attorneysSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`✅ Found ${attorneyList.length} attorneys`, attorneyList);
        setAttorneys(attorneyList);

        // Test 2: Fetch all entries using collectionGroup
        console.log('Test 2: Fetching all entries across attorneys...');
        const entriesSnapshot = await getDocs(collectionGroup(db, 'entries'));
        const entriesList = entriesSnapshot.docs.map(doc => {
          const pathParts = doc.ref.path.split('/');
          const attorneyId = pathParts[1];
          
          return {
            id: doc.id,
            attorneyId: attorneyId,
            path: doc.ref.path,
            ...doc.data()
          };
        });
        
        console.log(`✅ Found ${entriesList.length} total entries`, entriesList);
        setEntries(entriesList);

        // Test 3: Fetch entries for first attorney (if exists)
        if (attorneyList.length > 0) {
          const firstAttorney = attorneyList[0];
          console.log(`Test 3: Fetching entries for ${firstAttorney.name || firstAttorney.id}...`);
          
          const attorneyEntriesRef = collection(db, 'attorneys', firstAttorney.id, 'entries');
          const attorneyEntriesSnapshot = await getDocs(attorneyEntriesRef);
          
          console.log(`✅ Found ${attorneyEntriesSnapshot.size} entries for this attorney`);
        }

        // Set test results
        setTestResults({
          attorneysFound: attorneyList.length,
          entriesFound: entriesList.length,
          sampleAttorney: attorneyList[0] || null,
          sampleEntry: entriesList[0] || null,
        });

        console.log('✅ All tests passed!');
        setLoading(false);

      } catch (err) {
        console.error('❌ Firebase test failed:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-xl text-gray-700">Testing Firebase connection...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-red-900 mb-2">❌ Firebase Connection Failed</h2>
                <p className="text-red-700 mb-4">{error}</p>
                
                <div className="bg-white rounded p-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting Steps:</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                    <li>Check that your .env file exists with VITE_FIREBASE_* variables</li>
                    <li>Verify Firebase credentials are correct in .env</li>
                    <li>Ensure Firestore is enabled in Firebase Console</li>
                    <li>Check Firebase security rules allow read access</li>
                    <li>Restart your dev server: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 Firebase Connection Successful!
          </h1>
          <p className="text-gray-600">
            Your Firestore database is connected and working properly.
          </p>
        </div>

        {/* Test Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium uppercase">Attorneys Found</p>
                <p className="text-4xl font-bold mt-2">{testResults.attorneysFound}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium uppercase">Total Entries</p>
                <p className="text-4xl font-bold mt-2">{testResults.entriesFound}</p>
              </div>
              <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Attorneys List */}
        {attorneys.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">👥 Attorneys</h2>
              <p className="text-sm text-gray-600 mt-1">Found {attorneys.length} attorney document(s)</p>
            </div>
            <div className="divide-y divide-gray-200">
              {attorneys.map((attorney) => (
                <div key={attorney.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {attorney.name || attorney.id}
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">ID:</span>
                          <span className="ml-2 font-mono text-gray-900">{attorney.id}</span>
                        </div>
                        {attorney.year && (
                          <div>
                            <span className="text-gray-500">Year:</span>
                            <span className="ml-2 text-gray-900">{attorney.year}</span>
                          </div>
                        )}
                        {attorney.createdAt && (
                          <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-2 text-gray-900">
                              {new Date(attorney.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {entries.filter(e => e.attorneyId === attorney.id).length} entries
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Entry */}
        {testResults.sampleEntry && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">📄 Sample Entry</h2>
              <p className="text-sm text-gray-600 mt-1">Example of data structure</p>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <div className="text-gray-500 mb-2">Path: {testResults.sampleEntry.path}</div>
                <pre className="text-gray-900">{JSON.stringify(testResults.sampleEntry, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Recent Entries Table */}
        {entries.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">📊 Recent Entries</h2>
              <p className="text-sm text-gray-600 mt-1">Showing up to 10 most recent entries</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attorney</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.slice(0, 10).map((entry, index) => (
                    <tr key={entry.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.name || entry.attorneyId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.client || entry.company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.hours || entry.secondaryHours || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        {entry.billablesEarnings || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {entry.billingCategory || entry.category || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.month} {entry.year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data Warning */}
        {attorneys.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-yellow-900 mb-2">⚠️ No Data Found</h2>
                <p className="text-yellow-700 mb-4">
                  Firebase connection is working, but no attorneys or entries were found.
                </p>
                <div className="bg-white rounded p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Next Steps:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Go to Firebase Console → Firestore Database</li>
                    <li>Create a collection called <code className="bg-gray-100 px-2 py-1 rounded">attorneys</code></li>
                    <li>Add a document with your attorney information</li>
                    <li>Add a subcollection called <code className="bg-gray-100 px-2 py-1 rounded">entries</code> to the attorney</li>
                    <li>Add some sample entries</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Actions */}
        {attorneys.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-green-900 mb-2">✅ Ready to proceed!</h2>
            <p className="text-green-700 mb-4">
              Your Firestore database is properly configured. You can now use the main dashboard.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FirebaseTest;