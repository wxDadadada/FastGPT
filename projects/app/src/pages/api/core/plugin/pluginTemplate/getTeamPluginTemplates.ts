import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoPlugin } from '@fastgpt/service/core/plugin/schema';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { FlowNodeTemplateType } from '@fastgpt/global/core/workflow/type/index.d';
import { FlowNodeTemplateTypeEnum } from '@fastgpt/global/core/workflow/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { parentId, searchKey } = req.query as { parentId?: string; searchKey?: string };
    const { teamId } = await authCert({ req, authToken: true });

    const userPlugins = await (async () => {
      if (searchKey) {
        return MongoPlugin.find({
          teamId,
          // search name or intro
          $or: [
            { name: { $regex: searchKey, $options: 'i' } },
            { intro: { $regex: searchKey, $options: 'i' } }
          ]
        })
          .sort({
            updateTime: -1
          })
          .lean();
      } else {
        return MongoPlugin.find({ teamId, parentId: parentId || null })
          .sort({
            updateTime: -1
          })
          .lean();
      }
    })();

    const data: FlowNodeTemplateType[] = userPlugins.map((plugin) => ({
      id: String(plugin._id),
      parentId: String(plugin.parentId),
      pluginId: String(plugin._id),
      pluginType: plugin.type,
      templateType: FlowNodeTemplateTypeEnum.personalPlugin,
      flowNodeType: FlowNodeTypeEnum.pluginModule,
      avatar: plugin.avatar,
      name: plugin.name,
      intro: plugin.intro,
      showStatus: false,
      version: '481',
      inputs: [],
      outputs: []
    }));

    jsonRes<FlowNodeTemplateType[]>(res, {
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
