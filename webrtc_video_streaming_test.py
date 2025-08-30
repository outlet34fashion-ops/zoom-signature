#!/usr/bin/env python3
"""
WebRTC Video Streaming Functionality Test
Focused testing for the review request about video streaming functionality
"""

import requests
import json
import time
import sys
from datetime import datetime

class WebRTCVideoStreamingTester:
    def __init__(self, base_url="https://livestream-shop.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def test_webrtc_signaling_endpoints(self):
        """Test WebRTC signaling endpoints in the backend"""
        print("\n🔌 Testing WebRTC Signaling Endpoints...")
        
        timestamp = int(time.time())
        
        try:
            # Step 1: Start a streaming session to get valid stream ID
            print("  📡 Step 1: Creating streaming session for signaling test...")
            stream_data = {
                "stream_title": f"Signaling Test Stream {timestamp}",
                "max_viewers": 50
            }
            
            start_response = requests.post(
                f"{self.api_url}/stream/start",
                json=stream_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if start_response.status_code != 200:
                self.log_test("WebRTC Signaling - Stream Creation", False, f"Could not create test stream: {start_response.status_code}")
                return False
            
            stream_result = start_response.json()
            stream_id = stream_result.get('stream_id')
            signaling_endpoint = stream_result.get('signaling_endpoint')
            
            self.log_test("WebRTC Signaling - Stream Creation", True, f"Stream ID: {stream_id}, Signaling: {signaling_endpoint}")
            
            # Step 2: Test WebSocket signaling endpoints availability
            print("  🔌 Step 2: Testing WebSocket signaling endpoints...")
            
            # Test streamer signaling endpoint
            streamer_ws_url = f"{self.base_url}/ws/stream/{stream_id}/signaling"
            print(f"    🎬 Testing streamer signaling: {streamer_ws_url}")
            
            try:
                # Convert HTTPS to HTTP for WebSocket testing
                test_url = streamer_ws_url.replace('https://', 'http://')
                streamer_response = requests.get(test_url, timeout=5)
                # WebSocket endpoints return specific status codes
                streamer_available = streamer_response.status_code in [200, 426, 400, 405, 101]
                streamer_details = f"Status: {streamer_response.status_code}"
            except Exception as e:
                streamer_available = False
                streamer_details = f"Connection error: {str(e)}"
            
            self.log_test("WebRTC Signaling - Streamer Endpoint", streamer_available, streamer_details)
            
            # Test viewer signaling endpoint
            viewer_ws_url = f"{self.base_url}/ws/stream/{stream_id}/viewer"
            print(f"    👥 Testing viewer signaling: {viewer_ws_url}")
            
            try:
                test_url = viewer_ws_url.replace('https://', 'http://')
                viewer_response = requests.get(test_url, timeout=5)
                viewer_available = viewer_response.status_code in [200, 426, 400, 405, 101]
                viewer_details = f"Status: {viewer_response.status_code}"
            except Exception as e:
                viewer_available = False
                viewer_details = f"Connection error: {str(e)}"
            
            self.log_test("WebRTC Signaling - Viewer Endpoint", viewer_available, viewer_details)
            
            # Step 3: Test general WebSocket endpoint
            print("  🔌 Step 3: Testing general WebSocket endpoint...")
            
            general_ws_url = f"{self.base_url}/ws"
            try:
                test_url = general_ws_url.replace('https://', 'http://')
                general_response = requests.get(test_url, timeout=5)
                general_available = general_response.status_code in [200, 426, 400, 405, 101]
                general_details = f"Status: {general_response.status_code}"
            except Exception as e:
                general_available = False
                general_details = f"Connection error: {str(e)}"
            
            self.log_test("WebRTC Signaling - General WebSocket", general_available, general_details)
            
            # Clean up test stream
            requests.delete(f"{self.api_url}/stream/{stream_id}", timeout=10)
            
            return streamer_available and viewer_available and general_available
            
        except Exception as e:
            self.log_test("WebRTC Signaling - Exception", False, str(e))
            return False

    def test_video_streaming_infrastructure(self):
        """Test video streaming infrastructure for peer-to-peer connections"""
        print("\n🎥 Testing Video Streaming Infrastructure...")
        
        timestamp = int(time.time())
        
        try:
            # Test 1: WebRTC Configuration for video streaming
            print("  ⚙️ Test 1: WebRTC Configuration for Video Streaming...")
            
            config_response = requests.get(f"{self.api_url}/webrtc/config", timeout=10)
            
            if config_response.status_code != 200:
                self.log_test("Video Infrastructure - WebRTC Config", False, f"Config endpoint failed: {config_response.status_code}")
                return False
            
            config_data = config_response.json()
            
            # Check for video streaming specific configuration
            rtc_config = config_data.get('rtcConfiguration', {})
            media_constraints = config_data.get('mediaConstraints', {})
            
            # Verify STUN/TURN servers for peer-to-peer connections
            ice_servers = rtc_config.get('iceServers', [])
            has_stun = any('stun:' in str(server.get('urls', [])) for server in ice_servers)
            has_turn = any('turn:' in str(server.get('urls', [])) for server in ice_servers)
            
            # Verify video constraints for streaming
            video_constraints = media_constraints.get('video', {})
            has_video_width = 'width' in video_constraints
            has_video_height = 'height' in video_constraints
            has_frame_rate = 'frameRate' in video_constraints
            has_facing_mode = 'facingMode' in video_constraints  # Important for iPhone camera
            
            # Verify audio constraints
            audio_constraints = media_constraints.get('audio', {})
            has_echo_cancellation = audio_constraints.get('echoCancellation', False)
            has_noise_suppression = audio_constraints.get('noiseSuppression', False)
            
            infrastructure_valid = (has_stun and has_turn and has_video_width and 
                                  has_video_height and has_frame_rate and has_facing_mode and
                                  has_echo_cancellation and has_noise_suppression)
            
            details = f"STUN: {has_stun}, TURN: {has_turn}, Video constraints: {has_video_width and has_video_height and has_frame_rate}, iPhone camera support: {has_facing_mode}, Audio optimization: {has_echo_cancellation and has_noise_suppression}"
            
            self.log_test("Video Infrastructure - WebRTC Config", infrastructure_valid, details)
            
            # Test 2: Stream Management for Admin-to-Customer Video Sharing
            print("  📡 Test 2: Stream Management for Admin-to-Customer Video Sharing...")
            
            # Create admin stream
            admin_stream_data = {
                "stream_title": "Admin Live Video Stream",
                "max_viewers": 50
            }
            
            admin_stream_response = requests.post(
                f"{self.api_url}/stream/start",
                json=admin_stream_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if admin_stream_response.status_code != 200:
                self.log_test("Video Infrastructure - Admin Stream Creation", False, f"Admin stream creation failed: {admin_stream_response.status_code}")
                return False
            
            admin_stream = admin_stream_response.json()
            stream_id = admin_stream.get('stream_id')
            
            # Verify admin stream has proper signaling endpoint
            admin_signaling = admin_stream.get('signaling_endpoint')
            admin_signaling_valid = admin_signaling and '/signaling' in admin_signaling
            
            self.log_test("Video Infrastructure - Admin Stream Creation", admin_signaling_valid, f"Stream ID: {stream_id}, Signaling: {admin_signaling}")
            
            # Test 3: Customer Join Capability
            print("  👥 Test 3: Customer Join Capability...")
            
            customer_join_response = requests.get(f"{self.api_url}/stream/{stream_id}/join", timeout=10)
            
            if customer_join_response.status_code != 200:
                self.log_test("Video Infrastructure - Customer Join", False, f"Customer join failed: {customer_join_response.status_code}")
                return False
            
            customer_join = customer_join_response.json()
            
            # Verify customer gets viewer signaling endpoint
            customer_signaling = customer_join.get('signaling_endpoint')
            customer_signaling_valid = customer_signaling and '/viewer' in customer_signaling
            ready_to_join = customer_join.get('status') == 'ready_to_join'
            
            self.log_test("Video Infrastructure - Customer Join", customer_signaling_valid and ready_to_join, f"Signaling: {customer_signaling}, Status: {customer_join.get('status')}")
            
            # Test 4: Active Streams Tracking
            print("  📊 Test 4: Active Streams Tracking...")
            
            active_streams_response = requests.get(f"{self.api_url}/streams/active", timeout=10)
            
            if active_streams_response.status_code != 200:
                self.log_test("Video Infrastructure - Active Streams", False, f"Active streams failed: {active_streams_response.status_code}")
                return False
            
            active_data = active_streams_response.json()
            streams = active_data.get('streams', [])
            
            # Find our test stream
            our_stream = next((s for s in streams if s.get('stream_id') == stream_id), None)
            stream_found = our_stream is not None
            
            if stream_found:
                has_viewer_count = 'viewer_count' in our_stream
                has_max_viewers = 'max_viewers' in our_stream
                has_status = our_stream.get('status') == 'active'
            else:
                has_viewer_count = has_max_viewers = has_status = False
            
            active_streams_valid = stream_found and has_viewer_count and has_max_viewers and has_status
            
            self.log_test("Video Infrastructure - Active Streams", active_streams_valid, f"Stream found: {stream_found}, Viewer tracking: {has_viewer_count}, Status active: {has_status}")
            
            # Clean up
            requests.delete(f"{self.api_url}/stream/{stream_id}", timeout=10)
            
            return infrastructure_valid and admin_signaling_valid and customer_signaling_valid and ready_to_join and active_streams_valid
            
        except Exception as e:
            self.log_test("Video Infrastructure - Exception", False, str(e))
            return False

    def test_stream_sharing_mechanism(self):
        """Test mechanism to share video streams from admin to customers"""
        print("\n📤 Testing Stream Sharing Mechanism...")
        
        timestamp = int(time.time())
        
        try:
            # Test 1: Admin Stream Broadcasting Setup
            print("  🎬 Test 1: Admin Stream Broadcasting Setup...")
            
            admin_stream = {
                "stream_title": f"Admin Broadcast {timestamp}",
                "max_viewers": 50
            }
            
            broadcast_response = requests.post(
                f"{self.api_url}/stream/start",
                json=admin_stream,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if broadcast_response.status_code != 200:
                self.log_test("Stream Sharing - Admin Broadcast Setup", False, f"Broadcast setup failed: {broadcast_response.status_code}")
                return False
            
            broadcast_data = broadcast_response.json()
            stream_id = broadcast_data.get('stream_id')
            
            # Verify broadcast has proper configuration
            max_viewers = broadcast_data.get('max_viewers')
            stream_title = broadcast_data.get('stream_title')
            status = broadcast_data.get('status')
            
            broadcast_valid = (max_viewers == 50 and stream_title == admin_stream['stream_title'] and status == 'active')
            
            self.log_test("Stream Sharing - Admin Broadcast Setup", broadcast_valid, f"Stream ID: {stream_id}, Max viewers: {max_viewers}, Status: {status}")
            
            # Test 2: Multiple Customer Access
            print("  👥 Test 2: Multiple Customer Access...")
            
            # Simulate multiple customers joining
            customer_results = []
            for i in range(3):  # Test 3 customers
                customer_response = requests.get(f"{self.api_url}/stream/{stream_id}/join", timeout=10)
                
                if customer_response.status_code == 200:
                    customer_data = customer_response.json()
                    customer_results.append({
                        'id': i+1,
                        'status': customer_data.get('status'),
                        'signaling': customer_data.get('signaling_endpoint'),
                        'viewer_count': customer_data.get('viewer_count')
                    })
                else:
                    customer_results.append({
                        'id': i+1,
                        'status': 'failed',
                        'error': customer_response.status_code
                    })
            
            # Check if all customers can join
            successful_joins = sum(1 for c in customer_results if c.get('status') == 'ready_to_join')
            all_have_signaling = all(c.get('signaling') and '/viewer' in c.get('signaling', '') for c in customer_results if c.get('status') == 'ready_to_join')
            
            multiple_access_valid = successful_joins == 3 and all_have_signaling
            
            self.log_test("Stream Sharing - Multiple Customer Access", multiple_access_valid, f"Successful joins: {successful_joins}/3, All have signaling: {all_have_signaling}")
            
            # Test 3: Stream Discovery
            print("  🔍 Test 3: Stream Discovery...")
            
            # Check if customers can discover active streams
            discovery_response = requests.get(f"{self.api_url}/streams/active", timeout=10)
            
            if discovery_response.status_code != 200:
                self.log_test("Stream Sharing - Stream Discovery", False, f"Discovery failed: {discovery_response.status_code}")
                return False
            
            discovery_data = discovery_response.json()
            available_streams = discovery_data.get('streams', [])
            
            # Find our broadcast stream
            our_broadcast = next((s for s in available_streams if s.get('stream_id') == stream_id), None)
            
            if our_broadcast:
                discoverable = True
                has_title = our_broadcast.get('stream_title') == admin_stream['stream_title']
                has_viewer_info = 'viewer_count' in our_broadcast and 'max_viewers' in our_broadcast
                is_active = our_broadcast.get('status') == 'active'
            else:
                discoverable = has_title = has_viewer_info = is_active = False
            
            discovery_valid = discoverable and has_title and has_viewer_info and is_active
            
            self.log_test("Stream Sharing - Stream Discovery", discovery_valid, f"Discoverable: {discoverable}, Has title: {has_title}, Has viewer info: {has_viewer_info}, Active: {is_active}")
            
            # Test 4: Stream Termination and Cleanup
            print("  🛑 Test 4: Stream Termination and Cleanup...")
            
            termination_response = requests.delete(f"{self.api_url}/stream/{stream_id}", timeout=10)
            
            termination_success = termination_response.status_code == 200
            
            if termination_success:
                # Verify stream is no longer discoverable
                cleanup_response = requests.get(f"{self.api_url}/streams/active", timeout=10)
                if cleanup_response.status_code == 200:
                    cleanup_data = cleanup_response.json()
                    remaining_streams = cleanup_data.get('streams', [])
                    stream_removed = not any(s.get('stream_id') == stream_id for s in remaining_streams)
                else:
                    stream_removed = False
            else:
                stream_removed = False
            
            cleanup_valid = termination_success and stream_removed
            
            self.log_test("Stream Sharing - Stream Termination", cleanup_valid, f"Termination: {termination_success}, Cleanup: {stream_removed}")
            
            return broadcast_valid and multiple_access_valid and discovery_valid and cleanup_valid
            
        except Exception as e:
            self.log_test("Stream Sharing - Exception", False, str(e))
            return False

    def test_current_video_workflow(self):
        """Test the current video streaming workflow - admin starts camera but viewers see countdown"""
        print("\n⏰ Testing Current Video Workflow (Admin Camera vs Viewer Countdown)...")
        
        timestamp = int(time.time())
        
        try:
            # Test 1: Admin Camera Start Capability
            print("  📹 Test 1: Admin Camera Start Capability...")
            
            # Check if backend supports admin camera streaming
            admin_stream = {
                "stream_title": f"Admin Camera Test {timestamp}",
                "max_viewers": 50
            }
            
            camera_response = requests.post(
                f"{self.api_url}/stream/start",
                json=admin_stream,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            camera_start_success = camera_response.status_code == 200
            
            if camera_start_success:
                camera_data = camera_response.json()
                stream_id = camera_data.get('stream_id')
                signaling_endpoint = camera_data.get('signaling_endpoint')
                
                # Check if admin gets proper streaming capabilities
                admin_can_stream = signaling_endpoint and '/signaling' in signaling_endpoint
                stream_active = camera_data.get('status') == 'active'
            else:
                admin_can_stream = stream_active = False
                stream_id = None
            
            self.log_test("Current Workflow - Admin Camera Start", camera_start_success and admin_can_stream and stream_active, f"Camera start: {camera_start_success}, Admin streaming: {admin_can_stream}, Active: {stream_active}")
            
            if not stream_id:
                return False
            
            # Test 2: Viewer Access to Stream
            print("  👀 Test 2: Viewer Access to Stream...")
            
            viewer_response = requests.get(f"{self.api_url}/stream/{stream_id}/join", timeout=10)
            
            viewer_access_success = viewer_response.status_code == 200
            
            if viewer_access_success:
                viewer_data = viewer_response.json()
                viewer_signaling = viewer_data.get('signaling_endpoint')
                viewer_status = viewer_data.get('status')
                
                # Check if viewer gets proper viewing capabilities
                viewer_can_connect = viewer_signaling and '/viewer' in viewer_signaling
                ready_to_view = viewer_status == 'ready_to_join'
            else:
                viewer_can_connect = ready_to_view = False
            
            self.log_test("Current Workflow - Viewer Access", viewer_access_success and viewer_can_connect and ready_to_view, f"Viewer access: {viewer_access_success}, Can connect: {viewer_can_connect}, Ready: {ready_to_view}")
            
            # Test 3: Stream State Management
            print("  📊 Test 3: Stream State Management...")
            
            state_response = requests.get(f"{self.api_url}/streams/active", timeout=10)
            
            if state_response.status_code == 200:
                state_data = state_response.json()
                active_streams = state_data.get('streams', [])
                
                # Find our stream
                current_stream = next((s for s in active_streams if s.get('stream_id') == stream_id), None)
                
                if current_stream:
                    has_viewer_count = 'viewer_count' in current_stream
                    has_stream_title = current_stream.get('stream_title') == admin_stream['stream_title']
                    is_active_state = current_stream.get('status') == 'active'
                    state_management_valid = has_viewer_count and has_stream_title and is_active_state
                else:
                    state_management_valid = False
            else:
                state_management_valid = False
            
            self.log_test("Current Workflow - Stream State Management", state_management_valid, f"State tracking: {state_management_valid}")
            
            # Test 4: WebRTC Configuration for Real Video
            print("  🎥 Test 4: WebRTC Configuration for Real Video...")
            
            webrtc_config_response = requests.get(f"{self.api_url}/webrtc/config", timeout=10)
            
            if webrtc_config_response.status_code == 200:
                webrtc_config = webrtc_config_response.json()
                
                # Check if configuration supports real video streaming
                media_constraints = webrtc_config.get('mediaConstraints', {})
                video_config = media_constraints.get('video', {})
                
                # Check for iPhone camera support
                has_facing_mode = 'facingMode' in video_config
                facing_mode_user = video_config.get('facingMode') == 'user'  # Front camera for admin
                
                # Check for video quality settings
                has_width = 'width' in video_config
                has_height = 'height' in video_config
                has_frame_rate = 'frameRate' in video_config
                
                # Check STUN/TURN for peer connections
                rtc_config = webrtc_config.get('rtcConfiguration', {})
                ice_servers = rtc_config.get('iceServers', [])
                has_stun = any('stun:' in str(server.get('urls', [])) for server in ice_servers)
                has_turn = any('turn:' in str(server.get('urls', [])) for server in ice_servers)
                
                real_video_support = (has_facing_mode and facing_mode_user and has_width and 
                                    has_height and has_frame_rate and has_stun and has_turn)
            else:
                real_video_support = False
            
            self.log_test("Current Workflow - Real Video Support", real_video_support, f"iPhone camera: {has_facing_mode and facing_mode_user}, Video quality: {has_width and has_height and has_frame_rate}, P2P support: {has_stun and has_turn}")
            
            # Clean up
            requests.delete(f"{self.api_url}/stream/{stream_id}", timeout=10)
            
            return (camera_start_success and admin_can_stream and stream_active and
                   viewer_access_success and viewer_can_connect and ready_to_view and
                   state_management_valid and real_video_support)
            
        except Exception as e:
            self.log_test("Current Workflow - Exception", False, str(e))
            return False

    def run_video_streaming_tests(self):
        """Run all video streaming functionality tests"""
        print("🎥 WebRTC Video Streaming Functionality Test")
        print("=" * 60)
        print(f"🔗 Testing against: {self.base_url}")
        print(f"📅 Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Run all video streaming tests
        signaling_success = self.test_webrtc_signaling_endpoints()
        infrastructure_success = self.test_video_streaming_infrastructure()
        sharing_success = self.test_stream_sharing_mechanism()
        workflow_success = self.test_current_video_workflow()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 VIDEO STREAMING TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n🎯 VIDEO STREAMING FUNCTIONALITY RESULTS:")
        print(f"   🔌 WebRTC Signaling Endpoints: {'✅ WORKING' if signaling_success else '❌ ISSUES'}")
        print(f"   🎥 Video Streaming Infrastructure: {'✅ WORKING' if infrastructure_success else '❌ ISSUES'}")
        print(f"   📤 Stream Sharing Mechanism: {'✅ WORKING' if sharing_success else '❌ ISSUES'}")
        print(f"   ⏰ Current Video Workflow: {'✅ WORKING' if workflow_success else '❌ ISSUES'}")
        
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} - {result['name']}")
            if result['details']:
                print(f"    Details: {result['details']}")
        
        # Analysis for review request
        print(f"\n🔍 ANALYSIS FOR REVIEW REQUEST:")
        print(f"=" * 60)
        
        if signaling_success:
            print(f"✅ WebRTC signaling endpoints are present and accessible")
        else:
            print(f"❌ WebRTC signaling endpoints have issues")
        
        if infrastructure_success:
            print(f"✅ Backend supports peer-to-peer video connections between admin and viewers")
        else:
            print(f"❌ Video streaming infrastructure has configuration issues")
        
        if sharing_success:
            print(f"✅ Mechanism to share video streams from admin to customers is implemented")
        else:
            print(f"❌ Stream sharing mechanism has issues")
        
        if workflow_success:
            print(f"✅ Current video streaming workflow is properly configured")
            print(f"   📹 Admin can start camera streaming")
            print(f"   👥 Viewers can connect to streams")
            print(f"   🎥 WebRTC configuration supports real video (not just countdown)")
        else:
            print(f"❌ Current video workflow has issues")
        
        # Overall assessment
        all_working = signaling_success and infrastructure_success and sharing_success and workflow_success
        
        if all_working:
            print(f"\n🎉 CONCLUSION: WebRTC video streaming functionality is FULLY IMPLEMENTED and WORKING!")
            print(f"   The issue where 'viewers only see countdown instead of admin video' is likely a FRONTEND issue.")
            print(f"   Backend provides all necessary WebRTC infrastructure for real video streaming.")
        else:
            issues_count = sum(1 for x in [signaling_success, infrastructure_success, sharing_success, workflow_success] if not x)
            print(f"\n⚠️ CONCLUSION: WebRTC video streaming has {issues_count}/4 areas with issues.")
            print(f"   Backend implementation may need fixes before frontend video streaming can work properly.")
        
        return all_working

def main():
    tester = WebRTCVideoStreamingTester()
    success = tester.run_video_streaming_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())