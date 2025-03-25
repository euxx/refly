import { useEffect, useState } from 'react';
import { Form, Input, message, Modal, Upload } from 'antd';
import { useTranslation } from 'react-i18next';
import getClient from '@refly-packages/ai-workspace-common/requests/proxiedRequest';
import { useExportCanvasAsImage } from '@refly-packages/ai-workspace-common/hooks/use-export-canvas-as-image';
import ImgCrop from 'antd-img-crop';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { MdLibraryBooks } from 'react-icons/md';

import { BiSolidEdit } from 'react-icons/bi';

interface CreateProjectModalProps {
  title?: string;
  description?: string;
  coverPicture?: string;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const CreateProjectModal = ({
  title,
  description,
  coverPicture,
  visible,
  setVisible,
}: CreateProjectModalProps) => {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { uploadCanvasCover } = useExportCanvasAsImage();
  const [loadingCoverPicture, setLoadingCoverPicture] = useState(false);
  const [coverPictureUrl, setCoverPictureUrl] = useState(coverPicture);

  const createTemplate = async ({ title, description }: { title: string; description: string }) => {
    if (confirmLoading) return;

    setConfirmLoading(true);
    const { storageKey } = await uploadCanvasCover();
    const { data } = await getClient().createCanvasTemplate({
      body: {
        title,
        description,
        language: i18n.language,
        categoryId: 'project',
        canvasId: 'project',
        coverStorageKey: storageKey,
      },
    });
    setConfirmLoading(false);
    if (data?.success) {
      setVisible(false);
      message.success(t('template.createSuccess'));
    }
  };

  const onSubmit = () => {
    form.validateFields().then((values) => {
      createTemplate(values);
    });
  };

  const uploadCoverPicture = async (file: File) => {
    if (loadingCoverPicture) return;
    setLoadingCoverPicture(true);
    const { data } = await getClient().upload({
      body: { file, visibility: 'public' },
    });
    setLoadingCoverPicture(false);
    if (data?.data?.url) {
      setCoverPictureUrl(data.data.url);
    }
  };

  const beforeUpload = (file: File) => {
    const isValidType = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(file.type);
    if (!isValidType) {
      message.error(t('project.create.onlyImageAllowed', { type: 'PNG, JPG, JPEG, GIF' }));
      return Upload.LIST_IGNORE;
    }

    const isValidSize = file.size / 1024 / 1024 < 2;
    if (!isValidSize) {
      message.error(t('project.create.imageSizeLimited', { size: 2 }));
      return Upload.LIST_IGNORE;
    }

    uploadCoverPicture(file);

    return false;
  };

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        title,
        description,
      });
      setCoverPictureUrl(coverPicture);
    }
  }, [visible]);

  return (
    <Modal
      centered
      open={visible}
      onCancel={() => setVisible(false)}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      title={t('project.createModal.title')}
    >
      <div className="w-full h-full pt-4 overflow-y-auto">
        <Form form={form} labelCol={{ span: 5 }}>
          <Form.Item
            required
            label={t('project.createModal.title')}
            name="title"
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('project.createModal.titlePlaceholder')} />
          </Form.Item>
          <Form.Item label={t('project.createModal.coverPicture')} name="coverPicture">
            <ImgCrop
              rotationSlider
              modalTitle={t('project.createModal.cropCoverPicture')}
              modalOk={t('common.confirm')}
              modalCancel={t('common.cancel')}
            >
              <Upload
                listType="picture-card"
                name="coverPicture"
                showUploadList={false}
                beforeUpload={beforeUpload}
              >
                <div className="w-full h-full group relative bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                  {loadingCoverPicture && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <AiOutlineLoading3Quarters size={22} className="animate-spin text-white" />
                    </div>
                  )}
                  {!loadingCoverPicture && (
                    <div className="absolute invisible group-hover:visible inset-0 bg-black/20 flex items-center justify-center">
                      <BiSolidEdit size={22} className="text-white" />
                    </div>
                  )}

                  {coverPictureUrl ? (
                    <img
                      src={coverPictureUrl}
                      alt="coverPicture"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <MdLibraryBooks size={32} className="text-white" />
                      <div className="text-gray-400 text-xs mt-1">
                        {t('project.createModal.uploadCoverPicture')}
                      </div>
                    </div>
                  )}
                </div>
              </Upload>
            </ImgCrop>
          </Form.Item>
          <Form.Item label={t('project.createModal.description')} name="description">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('project.createModal.descriptionPlaceholder')}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
