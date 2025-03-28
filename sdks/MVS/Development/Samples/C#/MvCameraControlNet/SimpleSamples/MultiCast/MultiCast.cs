﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MvCamCtrl.NET;
using System.Runtime.InteropServices;
using System.IO;
using System.Threading;

namespace MultiCast
{
    class MultiCast
    {
        private static MyCamera device;
        public static bool g_bExit = false;

        static void WorkThread()
        {
            MyCamera.MV_FRAME_OUT stFrameOut = new MyCamera.MV_FRAME_OUT();
            while (true)
            {
                int nRet = device.MV_CC_GetImageBuffer_NET(ref stFrameOut, 1000);
                // ch:获取一帧图像 | en:Get image
                if (MyCamera.MV_OK == nRet)
                {
                    Console.WriteLine("Get One Frame:" + "Width[" + Convert.ToString(stFrameOut.stFrameInfo.nWidth) + "] , Height[" + Convert.ToString(stFrameOut.stFrameInfo.nHeight)
                                    + "] , FrameNum[" + Convert.ToString(stFrameOut.stFrameInfo.nFrameNum) + "]");
                    device.MV_CC_FreeImageBuffer_NET(ref stFrameOut);
                }
                else
                {
                    Console.WriteLine("Get Image failed:{0:x8}", nRet);
                }
                if (g_bExit)
                {
                    break;
                }
            }
        }

        static void Main(string[] args)
        {
            device = new MyCamera();
            int nRet = MyCamera.MV_OK;

            // ch: 初始化 SDK | en: Initialize SDK
            MyCamera.MV_CC_Initialize_NET();

            do{
                // ch:枚举设备 | en:Enum deivce
                MyCamera.MV_CC_DEVICE_INFO_LIST stDevList = new MyCamera.MV_CC_DEVICE_INFO_LIST();
                nRet = MyCamera.MV_CC_EnumDevices_NET(MyCamera.MV_GIGE_DEVICE | MyCamera.MV_USB_DEVICE, ref stDevList);
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Enum device failed:{0:x8}", nRet);
                    break;
                }
                Console.WriteLine("Enum device count : " + Convert.ToString(stDevList.nDeviceNum));
                if (0 == stDevList.nDeviceNum)
                {
                    break;
                }

                MyCamera.MV_CC_DEVICE_INFO stDevInfo;

                // ch:打印设备信息 en:Print device info
                for (Int32 i = 0; i < stDevList.nDeviceNum; i++)
                {
                    stDevInfo = (MyCamera.MV_CC_DEVICE_INFO)Marshal.PtrToStructure(stDevList.pDeviceInfo[i], typeof(MyCamera.MV_CC_DEVICE_INFO));

                    if (MyCamera.MV_GIGE_DEVICE == stDevInfo.nTLayerType)
                    {
                        MyCamera.MV_GIGE_DEVICE_INFO_EX stGigEDeviceInfo = (MyCamera.MV_GIGE_DEVICE_INFO_EX)MyCamera.ByteToStruct(stDevInfo.SpecialInfo.stGigEInfo, typeof(MyCamera.MV_GIGE_DEVICE_INFO_EX));
                        uint nIp1 = ((stGigEDeviceInfo.nCurrentIp & 0xff000000) >> 24);
                        uint nIp2 = ((stGigEDeviceInfo.nCurrentIp & 0x00ff0000) >> 16);
                        uint nIp3 = ((stGigEDeviceInfo.nCurrentIp & 0x0000ff00) >> 8);
                        uint nIp4 = (stGigEDeviceInfo.nCurrentIp & 0x000000ff);
                        Console.WriteLine("[device " + i.ToString() + "]:");
                        Console.WriteLine("DevIP:" + nIp1 + "." + nIp2 + "." + nIp3 + "." + nIp4);
                        Console.WriteLine("ModelName:" + stGigEDeviceInfo.chModelName + "\n");
                    }
                    else if (MyCamera.MV_USB_DEVICE == stDevInfo.nTLayerType)
                    {
                        MyCamera.MV_USB3_DEVICE_INFO_EX stUsb3DeviceInfo = (MyCamera.MV_USB3_DEVICE_INFO_EX)MyCamera.ByteToStruct(stDevInfo.SpecialInfo.stUsb3VInfo, typeof(MyCamera.MV_USB3_DEVICE_INFO_EX));
                        Console.WriteLine("[device " + i.ToString() + "]:");
                        Console.WriteLine("SerialNumber:" + stUsb3DeviceInfo.chSerialNumber);
                        Console.WriteLine("ModelName:" + stUsb3DeviceInfo.chModelName + "\n");
                    }
                }

                Int32 nDevIndex = 0;
                Console.Write("Please input index(0-{0:d}):", stDevList.nDeviceNum - 1);
                try
                {
                    nDevIndex = Convert.ToInt32(Console.ReadLine());
                }
                catch
                {
                    Console.Write("Invalid Input!\n");
                    break;
                }

                if (nDevIndex > stDevList.nDeviceNum - 1 || nDevIndex < 0)
                {
                    Console.Write("Input Error!\n");
                    break;
                }
                stDevInfo = (MyCamera.MV_CC_DEVICE_INFO)Marshal.PtrToStructure(stDevList.pDeviceInfo[nDevIndex], typeof(MyCamera.MV_CC_DEVICE_INFO));

                // ch:创建设备 | en: Create device
                nRet = device.MV_CC_CreateDevice_NET(ref stDevInfo);
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Create device failed:{0:x8}", nRet);
                    break;
                }

                // ch:查询用户使用的模式
                // Query the user for the mode to use.
                bool monitorMode = false;
                {
                    string key = "";

                    // Ask the user to launch the multicast controlling application or the multicast monitoring application.
                    Console.WriteLine("Start multicast sample in (c)ontrol or in (m)onitor mode? (c/m)\n");
                    do
                        key = Convert.ToString(Console.ReadLine());
                    while ((key != "c") && (key != "m") && (key != "C") && (key != "M"));
                          monitorMode = (key == "m") || (key == "M");
                }

                // ch:打开设备 | en:Open device
                if (monitorMode)
                {
                    nRet = device.MV_CC_OpenDevice_NET(MyCamera.MV_ACCESS_Monitor, 0);
                    if (MyCamera.MV_OK != nRet)
                    {
                        Console.WriteLine("Open device failed:{0:x8}", nRet);
                        break;
                    }
                }
                else
                {
                    nRet = device.MV_CC_OpenDevice_NET(MyCamera.MV_ACCESS_Control, 0);
                    if (MyCamera.MV_OK != nRet)
                    {
                        Console.WriteLine("Open device failed:{0:x8}", nRet);
                        break;
                    }
                }

                // ch:探测网络最佳包大小(只对GigE相机有效) | en:Detection network optimal package size(It only works for the GigE camera)
                if (stDevInfo.nTLayerType == MyCamera.MV_GIGE_DEVICE && false == monitorMode)
                {
                    int nPacketSize = device.MV_CC_GetOptimalPacketSize_NET();
                    if (nPacketSize > 0)
                    {
                        nRet = device.MV_CC_SetIntValueEx_NET("GevSCPSPacketSize", nPacketSize);
                        if (nRet != MyCamera.MV_OK)
                        {
                            Console.WriteLine("Warning: Set Packet Size failed {0:x8}", nRet);
                        }
                    }
                    else
                    {
                        Console.WriteLine("Warning: Get Packet Size failed {0:x8}", nPacketSize);
                    }
                }

                // ch:指定组播ip | en:The specified multicast IP
                string strIp = "239.192.1.1";
                var parts = strIp.Split('.');
                int nDestIp1 = Convert.ToInt32(parts[0]);
                int nDestIp2 = Convert.ToInt32(parts[1]);
                int nDestIp3 = Convert.ToInt32(parts[2]);
                int nDestIp4 = Convert.ToInt32(parts[3]);
                int nDestIp = (nDestIp1 << 24) | (nDestIp2 << 16) | (nDestIp3 << 8) | nDestIp4;

                // ch:可指定端口号作为组播组端口 | en:multicast port
                MyCamera.MV_CC_TRANSMISSION_TYPE stTransmissionType = new MyCamera.MV_CC_TRANSMISSION_TYPE();

                stTransmissionType.enTransmissionType = MyCamera.MV_GIGE_TRANSMISSION_TYPE.MV_GIGE_TRANSTYPE_MULTICAST;
                stTransmissionType.nDestIp = (uint)nDestIp;
                stTransmissionType.nDestPort = 1024;

                nRet = device.MV_GIGE_SetTransmissionType_NET(ref stTransmissionType);
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Set transmission type failed {0:x8}", nRet);
                    break;
                }

                // ch:开启抓图 || en: start grab image
                nRet = device.MV_CC_StartGrabbing_NET();
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Start grabbing failed:{0:x8}", nRet);
                    break;
                }

                Thread thr = new Thread(WorkThread);
                thr.Start();

                Console.WriteLine("Press enter to exit");
                Console.ReadLine();

                g_bExit = true;
                Thread.Sleep(1000);

                // ch:停止抓图 | en:Stop grabbing
                nRet = device.MV_CC_StopGrabbing_NET();
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Stop grabbing failed:{0:x8}", nRet);
                    break;
                }

                // ch:关闭设备 | en:Close device
                nRet = device.MV_CC_CloseDevice_NET();
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Close device failed:{0:x8}", nRet);
                    break;
                }

                // ch:销毁设备 | en:Destroy device
                nRet = device.MV_CC_DestroyDevice_NET();
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Destroy device failed:{0:x8}", nRet);
                    break;
                }
            } while (false);

            if (MyCamera.MV_OK != nRet)
            {
                // ch:销毁设备 | en:Destroy device
                nRet = device.MV_CC_DestroyDevice_NET();
                if (MyCamera.MV_OK != nRet)
                {
                    Console.WriteLine("Destroy device failed:{0:x8}", nRet);
                }
            }

            // ch: 反初始化SDK | en: Finalize SDK
            MyCamera.MV_CC_Finalize_NET();

            Console.WriteLine("Press enter to exit");
            Console.ReadKey();
        }
    }
}
