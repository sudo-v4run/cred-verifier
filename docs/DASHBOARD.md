# 📊 Performance Metrics Dashboard - User Guide

## 🎨 Three Dashboard Options

### 1. **Advanced Dashboard** (Recommended) - `metrics_dashboard.html`
**Best for: Beautiful visualizations and professional presentation**

**Features:**
- ✨ Stunning gradient design with animations
- 📊 Multiple chart types (Bar, Line, Doughnut)
- 🎯 Real-time stats with color-coded indicators
- 📈 Recent activity feed with detailed information
- 🔄 Auto-refresh every 15 seconds
- 📱 Fully responsive design

**How to Use:**
```bash
# Option 1: Open directly in browser
xdg-open metrics_dashboard.html

# Option 2: Or open manually
# Navigate to: file:///home/varun/blockchain/hello/metrics_dashboard.html
```

**Features:**
- Live monitoring indicator
- System overview with 4 key metrics
- Operations distribution chart
- Performance by operation type (line chart)
- Success rate analysis (doughnut chart)
- Throughput metrics
- Recent activity log
- Export to JSON functionality

---

### 2. **Metrics Dashboard** - `src/hello_frontend/src/metrics.html`
**Best for: Integration with frontend application**

**Features:**
- 🌐 Designed for frontend integration
- 📊 Chart.js powered visualizations
- 🔗 Ready for @dfinity/agent integration
- 💼 Professional card-based layout

**How to Use:**
```bash
# Access through frontend (when deployed)
http://localhost:4943/metrics.html
```

---

### 3. **Original Dashboard** - `performance_dashboard.html`
**Best for: Quick overview and testing**

**Features:**
- 🎯 Simple and clean interface
- 📊 Bar chart visualizations
- ⚡ Lightweight and fast

---

## 🚀 Getting Real Data

### Method 1: Command Line (Immediate)
```bash
# Get all metrics summaries
dfx canister call credential_backend getAllMetricsSummaries '()'

# Get performance snapshot
dfx canister call credential_backend getPerformanceSnapshot '()'

# Get recent metrics
dfx canister call credential_backend getRecentMetrics '(10)'

# Get metrics count
dfx canister call credential_backend getMetricsCount '()'
```

### Method 2: Run Performance Tests
```bash
# Quick performance test
./test_performance.sh

# Load test with custom size
./load_test.sh 20

# Results are automatically saved to timestamped files
```

### Method 3: Live API Server (Advanced)
```bash
# Start the metrics API server
./serve_metrics.sh

# This will:
# 1. Fetch metrics from canister
# 2. Generate JSON file
# 3. Start HTTP server on port 8080
# 4. Auto-refresh every 10 seconds
```

Then access:
- Dashboard: http://localhost:8080/metrics_dashboard.html
- Raw JSON: http://localhost:8080/metrics_data.json

---

## 📊 Dashboard Features Explained

### System Overview
- **Total Operations**: Total number of operations recorded
- **Certificates**: Total certificates in the system
- **Success Rate**: Percentage of successful operations
- **Avg Response**: Average operation duration in microseconds

### Operations Distribution
Bar chart showing the count of each operation type:
- Certificate Issuance
- Certificate Verification
- Certificate Revocation
- Merkle Tree Construction
- Merkle Proof Generation

### Performance Metrics
Line chart displaying average duration for each operation type.
- Lower is better
- Helps identify performance bottlenecks

### Success Rate Analysis
Doughnut chart showing:
- Successful operations (green)
- Failed operations (red)

### Throughput Metrics
Operations per second for:
- Certificate Issuance
- Certificate Verification

### Recent Activity
Live feed of recent operations with:
- Operation type
- Success/failure status
- Certificate ID
- Duration
- Timestamp

---

## 🎯 Use Cases

### 1. Performance Monitoring
```bash
# Run dashboard and monitor in real-time
xdg-open metrics_dashboard.html

# In another terminal, run load tests
./load_test.sh 50

# Watch metrics update in dashboard
```

### 2. Performance Testing
```bash
# Clear previous metrics
dfx canister call credential_backend clearMetrics '()'

# Run load test
./load_test.sh 100

# View results
xdg-open metrics_dashboard.html
```

### 3. Comparison Testing
```bash
# Test 1: Small batch
./load_test.sh 10
cp load_test_results_*.txt results_small.txt

# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Test 2: Large batch
./load_test.sh 100
cp load_test_results_*.txt results_large.txt

# Compare throughput
diff results_small.txt results_large.txt
```

### 4. Export Reports
- Click "Export Report" button in dashboard
- Downloads JSON file with timestamp
- Share with team or archive for records

---

## 🎨 Dashboard Customization

### Changing Chart Colors
Edit the `metrics_dashboard.html` file and modify:
```javascript
backgroundColor: [
    'rgba(102, 126, 234, 0.8)',  // Change these colors
    'rgba(16, 185, 129, 0.8)',
    // ...
]
```

### Changing Auto-Refresh Interval
```javascript
// Change from 15 seconds to 30 seconds
setInterval(refreshData, 30000);  // 30000 = 30 seconds
```

### Adding Custom Metrics
1. Add new API endpoint in `main.mo`
2. Fetch data in dashboard JavaScript
3. Create new chart or stat box
4. Update with fetched data

---

## 🔍 Troubleshooting

### Dashboard shows sample data
**Solution:** The dashboard uses sample data by default. To get real data:
```bash
# Option 1: Run CLI commands (shown above)
# Option 2: Start the metrics API server
./serve_metrics.sh
```

### Charts not displaying
**Problem:** Chart.js CDN not loading
**Solution:** Check internet connection, or download Chart.js locally

### Auto-refresh not working
**Check:** Browser console for errors
**Fix:** Ensure dfx is running: `dfx start --background`

### No metrics showing
**Check:** Run test first to generate metrics:
```bash
./test_performance.sh
```

---

## 📁 Dashboard Files

| File | Purpose | Best For |
|------|---------|----------|
| `metrics_dashboard.html` | Advanced dashboard | Presentations, demos |
| `src/hello_frontend/src/metrics.html` | Frontend integration | Production deployment |
| `performance_dashboard.html` | Simple dashboard | Quick checks |
| `serve_metrics.sh` | API server script | Live monitoring |
| `test_performance.sh` | Performance testing | Quick tests |
| `load_test.sh` | Load testing | Scalability tests |

---

## 🎯 Next Steps

1. **View Dashboard**: Open `metrics_dashboard.html` in browser
2. **Run Tests**: Execute `./load_test.sh 20` to generate data
3. **Monitor**: Watch real-time metrics in dashboard
4. **Export**: Download reports for documentation
5. **Customize**: Modify dashboard colors and layout to your needs

---

## 📞 Quick Commands Reference

```bash
# Open dashboard
xdg-open metrics_dashboard.html

# Run performance test
./test_performance.sh

# Run load test (20 certificates)
./load_test.sh 20

# Start API server
./serve_metrics.sh

# Get all metrics
dfx canister call credential_backend getAllMetricsSummaries '()'

# Clear metrics
dfx canister call credential_backend clearMetrics '()'

# Get recent activity
dfx canister call credential_backend getRecentMetrics '(10)'
```

---

**Created:** February 4, 2026  
**Status:** ✅ Ready to Use  
**Canister ID:** uxrrr-q7777-77774-qaaaq-cai
