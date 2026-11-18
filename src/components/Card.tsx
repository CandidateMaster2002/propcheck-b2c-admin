export default function Card({ title, value, icon, color = 'green' }: { 
  title: string; 
  value: string | number; 
  icon?: string; 
  color?: string;
}) {
  const colorClasses = {
    green: 'bg-green-50 text-success',
    blue: 'bg-blue-50 text-primary',
    yellow: 'bg-yellow-50 text-warn',
    red: 'bg-red-50 text-danger',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-text mb-1 font-medium">{title}</p>
          <p className="text-3xl font-bold text-text-dark">{value}</p>
        </div>
        {icon && (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses] || colorClasses.green}`}>
            <span className="text-3xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
