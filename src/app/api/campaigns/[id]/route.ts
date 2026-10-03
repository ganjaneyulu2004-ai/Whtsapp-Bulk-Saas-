import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { processCampaignSending } from "@/lib/queue";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";

    let campaignWhere: any = { id: params.id };

    if (!isAdmin) {
      const business = await getCurrentBusiness();
      campaignWhere.businessId = business.id;
    }

    const campaign = await prisma.campaign.findFirst({
      where: campaignWhere,
      include: {
        template: true,
        contactList: true,
        messageLogs: {
          include: { contact: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const notReadCount = Math.max(0, campaign.deliveredCount - campaign.readCount);
    const readRate = campaign.deliveredCount > 0
      ? Math.round((campaign.readCount / campaign.deliveredCount) * 100)
      : 0;

    const statusCounts = {
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      read: campaign.readCount,
      notRead: notReadCount,
      failed: campaign.failedCount,
      readRate,
    };

    return NextResponse.json({ campaign, statusCounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";

    let campaignWhere: any = { id: params.id };
    if (!isAdmin) {
      const business = await getCurrentBusiness();
      campaignWhere.businessId = business.id;
    }

    const body = await req.json();
    const { action } = body; // 'pause' | 'resume' | 'resend_failed' | 'duplicate' | 'resend_not_read'

    const campaign = await prisma.campaign.findFirst({
      where: campaignWhere,
      include: {
        messageLogs: {
          include: { contact: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (action === "pause") {
      const updated = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED" },
      });
      return NextResponse.json(updated);
    }

    if (action === "resume") {
      const updated = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENDING" },
      });
      processCampaignSending(campaign.id).catch((e) => console.error(e));
      return NextResponse.json(updated);
    }

    if (action === "resend_failed") {
      await prisma.messageLog.updateMany({
        where: { campaignId: campaign.id, status: "FAILED" },
        data: { status: "PENDING", errorCode: null, errorMessage: null },
      });

      const updated = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENDING", failedCount: 0 },
      });

      processCampaignSending(campaign.id).catch((e) => console.error(e));
      return NextResponse.json(updated);
    }

    // Resend to Not Read contacts action
    if (action === "resend_not_read") {
      const notReadLogs = campaign.messageLogs.filter(
        (log) => log.status === "DELIVERED" || log.status === "SENT" || log.status === "PENDING"
      );

      if (notReadLogs.length === 0) {
        return NextResponse.json(
          { error: "No unread contacts found for this campaign." },
          { status: 400 }
        );
      }

      // Create a targeted contact list for unread contacts
      const newList = await prisma.contactList.create({
        data: {
          businessId: campaign.businessId,
          name: `${campaign.name} (Unread Follow-up)`,
          description: `Auto-generated follow-up list with ${notReadLogs.length} contacts who have not read previous message.`,
          contactCount: notReadLogs.length,
        },
      });

      // Link contacts to this new list
      for (const log of notReadLogs) {
        if (log.contactId) {
          await prisma.contact.update({
            where: { id: log.contactId },
            data: { listId: newList.id },
          }).catch(() => {});
        } else {
          await prisma.contact.create({
            data: {
              businessId: campaign.businessId,
              listId: newList.id,
              name: log.recipientName,
              phone: log.phone,
            },
          }).catch(() => {});
        }
      }

      // Create new Campaign targeting this list
      const newCamp = await prisma.campaign.create({
        data: {
          businessId: campaign.businessId,
          name: `${campaign.name} (Resend to Unread)`,
          type: campaign.type,
          customType: campaign.customType,
          note: `Follow-up to unread recipients from campaign ${campaign.name}`,
          templateId: campaign.templateId,
          contactListId: newList.id,
          status: "DRAFT",
          totalRecipients: notReadLogs.length,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Created follow-up campaign with ${notReadLogs.length} unread recipients.`,
        newCampaignId: newCamp.id,
      });
    }

    if (action === "duplicate") {
      const newCamp = await prisma.campaign.create({
        data: {
          businessId: campaign.businessId,
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          customType: campaign.customType,
          note: campaign.note,
          templateId: campaign.templateId,
          contactListId: campaign.contactListId,
          status: "DRAFT",
          totalRecipients: campaign.totalRecipients,
        },
      });
      return NextResponse.json(newCamp);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
