export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🚲 BikeBayan Admin Dashboard</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-gray-500 text-sm">Total Bikes</div>
            <div className="text-3xl font-bold">3</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-gray-500 text-sm">Available</div>
            <div className="text-3xl font-bold text-green-600">2</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-gray-500 text-sm">Active Rentals</div>
            <div className="text-3xl font-bold text-blue-600">1</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-gray-500 text-sm">Overdue</div>
            <div className="text-3xl font-bold text-red-600">0</div>
          </div>
        </div>

        {/* Stations */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-bold mb-4">📍 Station Status</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Station A (Main)</h3>
                  <p className="text-sm text-gray-600">2 bikes available / 2 total</p>
                </div>
                <div className="text-green-600 font-bold">100% Available</div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Station B (Annex)</h3>
                  <p className="text-sm text-gray-600">0 bikes available / 1 total</p>
                </div>
                <div className="text-red-600 font-bold">Occupied</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Rentals */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">🔄 Active Rentals</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Bike</th>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-3">Juan Dela Cruz</td>
                <td className="px-4 py-3">Bike #3</td>
                <td className="px-4 py-3">Station B</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}